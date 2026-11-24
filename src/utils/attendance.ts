import type { AttendanceDay, BudgetItem, PayrollEntry, PayrollRecord, WeeklyJournal } from '../types';
import { settlePayroll } from './calculations';

export const todayInArgentina = () =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export const isCalendarDate = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date + 'T00:00:00Z').toJSON()?.slice(0, 10) === date;

export const addDays = (date: string, count: number) => {
    const day = new Date(date + 'T00:00:00Z');
    day.setUTCDate(day.getUTCDate() + count);
    return day.toISOString().slice(0, 10);
};

export const mondayOf = (date: string) => {
    const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
    return addDays(date, -((weekday + 6) % 7));
};

export const displayDate = (date: string) => date.split('-').reverse().join('/');
export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;
export const money = (amount: number) => '$' + roundMoney(amount).toLocaleString('es-AR');

const workedDays = (day: AttendanceDay) => {
    if (day.status === 'present') return 1;
    if (day.status === 'half') return 0.5;
    return 0;
};

const dailyCost = (day: AttendanceDay) => roundMoney(workedDays(day) * (day.dailyRate ?? 0));

const entryTotal = (entries: PayrollEntry[], kind: PayrollEntry['kind']) =>
    roundMoney(entries.reduce((sum, entry) => sum + (entry.kind === kind ? entry.amount : 0), 0));

export const summarizeJournal = (journal?: WeeklyJournal) => {
    const days = Object.entries(journal?.days ?? {});
    const entries = journal?.entries ?? [];
    const daysWorked = days.reduce((sum, [, day]) => sum + workedDays(day), 0);
    const gross = roundMoney(days.reduce((sum, [, day]) => sum + dailyCost(day), 0));
    const friday = journal ? addDays(journal.weekStart, 4) : '';
    const weekendGross = roundMoney(days.reduce(
        (sum, [date, day]) => sum + (date > friday ? dailyCost(day) : 0), 0
    ));
    const advances = entryTotal(entries, 'advance');
    const reimbursements = entryTotal(entries, 'reimbursement');
    const paidAmount = entryTotal(entries, 'payment');
    const settlement = settlePayroll(gross, { advances, reimbursements, paidAmount });
    const overpaid = Math.max(0, roundMoney(paidAmount - settlement.totalLiquidated));
    return { ...settlement, daysWorked, weekendGross, advances, reimbursements, paidAmount, overpaid };
};

export const journalsAsPayrolls = (journals: WeeklyJournal[]): PayrollRecord[] =>
    journals.flatMap((journal) => {
        const totals = summarizeJournal(journal);
        if (!totals.daysWorked && !journal.entries.length) return [];
        return [{
            ...totals,
            id: journal.weekStart + '_' + journal.employeeId,
            userId: journal.userId,
            employeeId: journal.employeeId,
            employeeName: journal.employeeName,
            isOwner: journal.isOwner,
            weekStart: journal.weekStart,
            weekEnd: addDays(journal.weekStart, 6),
            dailyRate: totals.daysWorked ? roundMoney(totals.grossPay / totals.daysWorked) : 0,
            createdAt: journal.createdAt,
        }];
    });

export const journalLabor = (journals: WeeklyJournal[]) => journals.flatMap((journal) =>
    Object.entries(journal.days).flatMap(([date, day]) => workedDays(day) ? [{
        date,
        workId: day.workId,
        workName: day.workName,
        employeeId: journal.employeeId,
        employeeName: journal.employeeName,
        isOwner: journal.isOwner,
        weekStart: journal.weekStart,
        days: workedDays(day),
        amount: dailyCost(day),
    }] : [])
);

export const workCosts = (items: BudgetItem[], labor: ReturnType<typeof journalLabor>) => {
    const costs = new Map<string, number>();
    for (const item of items) {
        const amount = item.quantity * item.unitActualCost;
        if (amount > 0) costs.set(item.workId, (costs.get(item.workId) ?? 0) + amount);
    }
    for (const day of labor) {
        if (day.workId) costs.set(day.workId, (costs.get(day.workId) ?? 0) + day.amount);
    }
    return costs;
};
