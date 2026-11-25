import { FirebaseError } from 'firebase/app';
import { collection, doc, getDocFromServer, onSnapshot, runTransaction, type Unsubscribe } from 'firebase/firestore';
import type { AttendanceDay, AttendanceStatus, Employee, PayrollEntry, WeeklyClosure, WeeklyJournal } from '../../types';
import { addDays, isCalendarDate, mondayOf, roundMoney, summarizeJournal, todayInArgentina } from '../../utils/attendance';
import { db } from '../firebase/firebase';

export const subscribeToJournals = (
    userId: string,
    onData: (data: WeeklyJournal[]) => void,
    onError: (error: Error) => void
): Unsubscribe => onSnapshot(
    collection(db, 'staff', userId, 'weeklyJournals'),
    (snapshot) => onData(snapshot.docs.map((entry) => entry.data() as WeeklyJournal)),
    onError
);

export const subscribeToClosures = (
    userId: string,
    onData: (data: WeeklyClosure[]) => void,
    onError: (error: Error) => void
): Unsubscribe => onSnapshot(
    collection(db, 'staff', userId, 'weeklyClosures'),
    (snapshot) => onData(snapshot.docs.map((entry) => entry.data() as WeeklyClosure)),
    onError
);

export const closeWeek = async (userId: string, weekStart: string) => {
    if (!isCalendarDate(weekStart) || mondayOf(weekStart) !== weekStart || addDays(weekStart, 4) > todayInArgentina()) {
        throw new Error('La semana se puede cerrar a partir del viernes.');
    }
    const ref = doc(db, 'staff', userId, 'weeklyClosures', weekStart);
    await runTransaction(db, async (transaction) => {
        if (!(await transaction.get(ref)).exists()) {
            transaction.set(ref, { weekStart, closedAt: new Date().toISOString() } satisfies WeeklyClosure);
        }
    });
};

const journalRef = (userId: string, employeeId: string, weekStart: string) =>
    doc(db, 'staff', userId, 'weeklyJournals', weekStart + '_' + employeeId);

const newJournal = (employee: Employee, weekStart: string): WeeklyJournal => ({
    userId: employee.userId,
    employeeId: employee.id,
    employeeName: employee.name,
    isOwner: employee.isOwner ?? false,
    weekStart,
    days: {},
    entries: [],
    createdAt: new Date().toISOString(),
});

export const saveAttendance = async (input: {
    userId: string;
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    work?: { id: string; name: string };
    previous?: AttendanceDay;
}) => {
    if (!isCalendarDate(input.date) || input.date > todayInArgentina()) throw new Error('Ingresá una fecha de asistencia válida.');
    const weekStart = mondayOf(input.date);
    const ref = journalRef(input.userId, input.employeeId, weekStart);
    const employeeRef = doc(db, 'employees', input.employeeId);
    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const journal = snapshot.data() as WeeklyJournal | undefined;
        const previous = journal?.days[input.date];
        if (previous?.status !== input.previous?.status
            || previous?.dailyRate !== input.previous?.dailyRate
            || previous?.workId !== input.previous?.workId) {
            throw new Error('La asistencia cambió en otra sesión. Revisá el valor actual y volvé a intentar.');
        }
        const needsRate = previous?.dailyRate == null && (input.status === 'present' || input.status === 'half');
        let updated = journal;
        let dailyRate = previous?.dailyRate ?? null;
        if (!updated || needsRate) {
            const data = (await transaction.get(employeeRef)).data() as Employee | undefined;
            if (data?.userId !== input.userId) throw new Error('No se encuentra el empleado.');
            updated ??= newJournal({ ...data, id: input.employeeId }, weekStart);
            if (needsRate) dailyRate = roundMoney(Math.max(0, Number(data.dailyRate) || 0));
        }
        updated.days[input.date] = {
            status: input.status,
            dailyRate,
            workId: input.work?.id ?? previous?.workId ?? '',
            workName: input.work?.name ?? previous?.workName ?? '',
        };
        transaction.set(ref, updated);
    });
};

export const registerJournalEntry = async (
    userId: string,
    employeeId: string,
    weekStart: string,
    entry: PayrollEntry,
    previous?: PayrollEntry
) => {
    const amount = roundMoney(entry.amount);
    if (!isCalendarDate(weekStart) || mondayOf(weekStart) !== weekStart
        || !Number.isFinite(amount) || amount <= 0
        || !isCalendarDate(entry.date) || entry.date > todayInArgentina()) {
        throw new Error('Ingresá un importe y una fecha válidos.');
    }
    const ref = journalRef(userId, employeeId, weekStart);
    const employeeRef = doc(db, 'employees', employeeId);
    const movementRef = doc(db, 'movements', 'payroll_' + entry.id);
    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        let journal = snapshot.data() as WeeklyJournal | undefined;
        if (!journal) {
            const data = (await transaction.get(employeeRef)).data() as Employee | undefined;
            if (data?.userId !== userId) throw new Error('No se encuentra el empleado.');
            journal = newJournal({ ...data, id: employeeId }, weekStart);
        }
        const index = journal.entries.findIndex((item) => item.id === entry.id);
        const saved = journal.entries[index];
        if (saved && !previous) return;
        if (previous && (!saved || saved.kind !== previous.kind || saved.date !== previous.date
            || saved.reference !== previous.reference || saved.amount !== previous.amount)) {
            throw new Error('El movimiento cambió en otra sesión. Abrilo de nuevo para corregirlo.');
        }
        const reference = entry.reference.trim();
        const otherEntries = journal.entries.filter((item) => item.id !== entry.id);
        const duplicate = otherEntries.some((item) => item.kind === entry.kind && (
            reference ? item.reference.toLowerCase() === reference.toLowerCase()
                : item.date === entry.date && item.amount === amount
        ));
        if (duplicate) {
            throw new Error('Ya hay un movimiento igual. Si corresponde a otro comprobante, ingresá su referencia.');
        }
        const maximum = Math.max(
            saved?.kind === 'payment' ? saved.amount : 0,
            summarizeJournal({ ...journal, entries: otherEntries }).pendingBalance
        );
        if (entry.kind === 'payment' && amount > maximum) {
            throw new Error('El pago supera el saldo pendiente. Revisá la liquidación actual.');
        }
        const entryIndex = index < 0 ? journal.entries.length : index;
        const voided = entry.kind === 'reimbursement';
        const hadCashMovement = !!saved && (saved.kind !== 'reimbursement' || saved.cashRecorded === true);
        const cashRecorded = !voided || hadCashMovement;
        journal.entries[entryIndex] = { ...entry, amount, reference, cashRecorded };
        transaction.set(ref, journal);

        if (cashRecorded) {
            const label = voided ? 'Reintegro' : entry.kind === 'advance' ? 'Adelanto' : 'Pago de jornal';
            transaction.set(movementRef, {
                userId,
                employeeId,
                account: 'myd',
                type: 'expense',
                source: 'payroll',
                category: journal.isOwner ? 'Remuneración del propietario' : 'Jornales / Adelantos',
                description: label + ' · ' + journal.employeeName,
                amount: voided ? 0 : amount,
                date: entry.date,
                voided,
                payrollJournalId: ref.id,
                payrollEntryIndex: entryIndex,
                ...(!hadCashMovement && { createdAt: new Date().toISOString() }),
            }, { merge: true });
        }
    }).catch(async (error: unknown) => {
        if (!(error instanceof FirebaseError) || error.code !== 'permission-denied') throw error;
        // A concurrent retry can reach the immutable cash document before Firestore retries the journal write.
        const journal = (await getDocFromServer(ref)).data() as WeeklyJournal | undefined;
        const saved = journal?.entries.find((item) => item.id === entry.id);
        if (saved?.kind === entry.kind && saved.amount === amount
            && saved.date === entry.date && saved.reference === entry.reference.trim()) return;
        throw error;
    });
};
