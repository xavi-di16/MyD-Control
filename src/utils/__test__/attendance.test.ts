import { describe, expect, it } from 'vitest';
import type { WeeklyJournal } from '../../types';
import { addDays, journalLabor, mondayOf, summarizeJournal, workCosts } from '../attendance';

const journal: WeeklyJournal = {
    userId: 'user',
    employeeId: 'employee',
    employeeName: 'Operario',
    isOwner: false,
    weekStart: '2026-11-23',
    createdAt: '2026-11-23T10:00:00Z',
    days: {
        '2026-11-23': { status: 'present', dailyRate: 70000, workId: 'a', workName: 'Obra A' },
        '2026-11-24': { status: 'absent', dailyRate: 70000, workId: 'a', workName: 'Obra A' },
        '2026-11-25': { status: 'present', dailyRate: 70000, workId: 'b', workName: 'Obra B' },
        '2026-11-28': { status: 'half', dailyRate: 80000, workId: 'a', workName: 'Obra A' },
    },
    entries: [
        { id: 'advance', kind: 'advance', amount: 20000, date: '2026-11-24', reference: '' },
        { id: 'reimbursement', kind: 'reimbursement', amount: 5000, date: '2026-11-26', reference: '' },
        { id: 'payment', kind: 'payment', amount: 125000, date: '2026-11-27', reference: '' },
    ],
};

describe('Asistencia y liquidación semanal', () => {
    it('usa la semana de lunes a domingo incluso al cambiar de año', () => {
        expect(mondayOf('2027-01-03')).toBe('2026-12-28');
        expect(addDays('2026-12-28', 4)).toBe('2027-01-01');
        expect(mondayOf('2027-01-04')).toBe('2027-01-04');
    });

    it('conserva los jornales diarios, incluye el extra del sábado y mantiene el pago previo', () => {
        const friday = { ...journal, days: { ...journal.days } };
        delete friday.days['2026-11-28'];
        expect(summarizeJournal(friday)).toMatchObject({ daysWorked: 2, grossPay: 140000, pendingBalance: 0 });
        expect(summarizeJournal(journal)).toMatchObject({
            daysWorked: 2.5,
            grossPay: 180000,
            weekendGross: 40000,
            advances: 20000,
            reimbursements: 5000,
            paidAmount: 125000,
            totalLiquidated: 165000,
            pendingBalance: 40000,
        });
    });

    it('asigna el costo diario por obra y conserva la categoría de propietario', () => {
        const owner = { ...journal, employeeId: 'owner', isOwner: true };
        const labor = journalLabor([journal, owner]);
        expect(labor.filter((day) => day.isOwner && day.workId === 'a').map((day) => day.amount)).toEqual([70000, 40000]);
        expect(workCosts([], labor).get('b')).toBe(140000);
    });
});
