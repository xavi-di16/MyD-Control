import { useState, type FormEvent } from 'react';
import { updateLegacyPayroll } from '../../services/firestore/employeesService';
import type { Employee, PayrollRecord, WeeklyJournal, Work } from '../../types';
import { isCalendarDate, money } from '../../utils/attendance';
import { calculatePayroll } from '../../utils/calculations';

const input = 'min-h-11 min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm';
const label = 'grid gap-1 text-xs font-semibold';
const numberFields = [
    ['daysWorked', 'Días trabajados'],
    ['dailyRate', 'Jornal diario ($)'],
    ['advances', 'Adelantos ($)'],
    ['reimbursements', 'Reintegros ($)'],
    ['paidAmount', 'Importe pagado ($)'],
] as const;

export const LegacyPayrollForm = ({ record, employees, works, legacy, journals, onClose }: {
    record: PayrollRecord;
    employees: Employee[];
    works: Work[];
    legacy: PayrollRecord[];
    journals: WeeklyJournal[];
    onClose: () => void;
}) => {
    const [original] = useState(record);
    const [form, setForm] = useState({
        employeeId: record.employeeId,
        workId: record.workId ?? '',
        weekStart: record.weekStart,
        weekEnd: record.weekEnd,
        daysWorked: String(record.daysWorked),
        dailyRate: String(record.dailyRate),
        advances: String(record.advances),
        reimbursements: String(record.reimbursements),
        paidAmount: String(record.paidAmount),
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const amounts = {
        daysWorked: Number(form.daysWorked),
        dailyRate: Number(form.dailyRate),
        advances: Number(form.advances),
        reimbursements: Number(form.reimbursements),
        paidAmount: Number(form.paidAmount),
    };
    const { totalLiquidated, pendingBalance } = calculatePayroll(amounts);
    const addsOverlap = (start: string, end: string) => {
        const overlapStart = start > form.weekStart ? start : form.weekStart;
        const overlapEnd = end < form.weekEnd ? end : form.weekEnd;
        return overlapStart <= overlapEnd && (form.employeeId !== original.employeeId
            || overlapStart < original.weekStart || overlapEnd > original.weekEnd);
    };

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        if (!isCalendarDate(form.weekStart) || !isCalendarDate(form.weekEnd) || form.weekStart > form.weekEnd) {
            setError('Revisá las fechas de la liquidación.');
            return;
        }
        if (
            legacy.some((item) => item.id !== original.id && item.employeeId === form.employeeId && addsOverlap(item.weekStart, item.weekEnd))
            || journals.some((journal) => journal.employeeId === form.employeeId && Object.entries(journal.days)
                .some(([date, day]) => (day.status === 'present' || day.status === 'half') && addsOverlap(date, date)))
        ) {
            setError('Ya hay una liquidación o asistencia cargada para esa persona en el período.');
            return;
        }
        const employee = employees.find((person) => person.id === form.employeeId);
        setSaving(true);
        setError('');
        try {
            await updateLegacyPayroll(original, {
                ...form, ...amounts,
                employeeName: form.employeeId === original.employeeId ? original.employeeName : employee?.name ?? original.employeeName,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la liquidación.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={(event) => void save(event)} className="col-span-full mt-2 space-y-3 rounded-lg border border-[#E5E7EB] bg-[#F5F6F8] p-3">
            <h3 className="font-bold">Editar liquidación anterior</h3>
            <fieldset disabled={saving} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className={label}>Persona
                    <select className={input} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                        {!employees.some((employee) => employee.id === record.employeeId) && <option value={record.employeeId}>{record.employeeName}</option>}
                        {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                    </select>
                </label>
                <label className={label}>Obra
                    <select className={input} value={form.workId} onChange={(e) => setForm({ ...form, workId: e.target.value })}>
                        <option value="">Sin obra asignada</option>
                        {record.workId && !works.some((work) => work.id === record.workId) && <option value={record.workId}>Obra archivada</option>}
                        {works.map((work) => <option key={work.id} value={work.id}>{work.name}</option>)}
                    </select>
                </label>
                <label className={label}>Desde
                    <input className={input} type="date" required value={form.weekStart} onChange={(e) => setForm({ ...form, weekStart: e.target.value })} />
                </label>
                <label className={label}>Hasta
                    <input className={input} type="date" required min={form.weekStart} value={form.weekEnd} onChange={(e) => setForm({ ...form, weekEnd: e.target.value })} />
                </label>
                {numberFields.map(([name, text]) => (
                    <label className={label} key={name}>{text}
                        <input className={input} type="number" required min="0" step={name === 'daysWorked' ? '0.5' : '0.01'}
                            value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
                    </label>
                ))}
            </fieldset>
            <p>Neto {money(totalLiquidated)} · Saldo {money(pendingBalance)}</p>
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[#F5C518] px-3 font-bold disabled:opacity-50">Guardar liquidación</button>
                <button type="button" disabled={saving} onClick={onClose} className={input}>Cancelar</button>
            </div>
        </form>
    );
};
