import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Employee, PayrollRecord, WeeklyClosure, WeeklyJournal, Work } from '../../types';
import { subscribeToClosures, subscribeToJournals } from '../../services/firestore/attendanceService';
import {
    createEmployee, markPayrollPaid, subscribeToEmployees, subscribeToLegacyPayrolls, updateEmployee,
} from '../../services/firestore/employeesService';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { displayDate, journalsAsPayrolls, money } from '../../utils/attendance';
import { AttendanceWeek } from './AttendanceWeek';
import { LegacyPayrollForm } from './LegacyPayrollForm';

const panel = 'space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6';
const control = 'min-h-11 min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm';
const button = 'min-h-11 rounded-lg px-3 text-sm font-bold disabled:opacity-50';
const emptyEmployee = { name: '', role: 'Operario', dailyRate: '', isOwner: false };

export const EmployeesPage = () => {
    const { user } = useAuth();
    return user && <EmployeesWorkspace key={user.uid} userId={user.uid} />;
};

const EmployeesWorkspace = ({ userId }: { userId: string }) => {
    const [params] = useSearchParams();
    const [employees, setEmployees] = useState<Employee[]>();
    const [journals, setJournals] = useState<WeeklyJournal[]>();
    const [closures, setClosures] = useState<WeeklyClosure[]>();
    const [legacy, setLegacy] = useState<PayrollRecord[]>();
    const [works, setWorks] = useState<Work[]>();
    const [error, setError] = useState('');
    const [editing, setEditing] = useState('');
    const [editingLegacy, setEditingLegacy] = useState('');
    const [employee, setEmployee] = useState(emptyEmployee);
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);

    useEffect(() => {
        const onError = (err: Error) => setError(err.message);
        const subscriptions = [
            subscribeToEmployees(userId, setEmployees, onError),
            subscribeToJournals(userId, setJournals, onError),
            subscribeToClosures(userId, setClosures, onError),
            subscribeToLegacyPayrolls(userId, setLegacy, onError),
            subscribeToWorks(userId, setWorks, onError),
        ];
        return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    }, [userId]);

    const save = async (action: () => Promise<unknown>) => {
        if (busy.current) return;
        busy.current = true;
        setSaving(true);
        setError('');
        try {
            await action();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    const edit = (person: Employee) => {
        setEditing(person.id);
        setEmployee({ ...person, dailyRate: String(person.dailyRate), isOwner: person.isOwner ?? false });
    };

    const reset = () => {
        setEditing('');
        setEmployee(emptyEmployee);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const data = {
            name: employee.name.trim(),
            role: employee.role.trim() || 'Operario',
            dailyRate: Number(employee.dailyRate),
            isOwner: employee.isOwner,
        };
        if (!data.name) return;
        void save(async () => {
            if (editing) await updateEmployee(editing, data);
            else await createEmployee({ userId, ...data });
            reset();
        });
    };

    const history = [...(legacy ?? []), ...journalsAsPayrolls(journals ?? [])]
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.employeeName.localeCompare(b.employeeName));
    const legacyIds = new Set(legacy?.map((item) => item.id));
    const closedWeeks = new Set(closures?.map((closure) => closure.weekStart));
    const movement = params.get('movement');
    const targetJournal = movement && journals?.find((journal) => journal.entries.some((entry) => 'payroll_' + entry.id === movement));
    const target = targetJournal && movement
        ? { weekStart: targetJournal.weekStart, employeeId: targetJournal.employeeId, entryId: movement.slice('payroll_'.length) }
        : undefined;

    return (
        <div className="space-y-6 text-[#171717]">
            <h1 className="text-2xl font-bold tracking-tight">Empleados y Liquidación de Jornales</h1>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {employees && journals && closures && legacy && works ? (
                <AttendanceWeek key={target?.entryId ?? 'all'} userId={userId} employees={employees} journals={journals}
                    closures={closures} legacy={legacy} works={works} target={target} />
            ) : !error && <p role="status" className="text-sm text-[#717784]">Cargando asistencia y liquidaciones…</p>}

            <section className={panel} aria-labelledby="roster-heading">
                <h2 id="roster-heading" className="text-lg font-bold">Nómina</h2>
                <form onSubmit={submit} className="space-y-3">
                    <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-3">
                        <label className="grid gap-1 text-xs font-semibold">
                            Nombre
                            <input required className={control} value={employee.name}
                                onChange={(e) => setEmployee({ ...employee, name: e.target.value })} />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                            Rol
                            <input className={control} value={employee.role}
                                onChange={(e) => setEmployee({ ...employee, role: e.target.value })} />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                            Valor del jornal ($)
                            <input required className={control} type="number" min="0" step="0.01" value={employee.dailyRate}
                                onChange={(e) => setEmployee({ ...employee, dailyRate: e.target.value })} />
                        </label>
                    </fieldset>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex min-h-11 items-center gap-2 text-sm">
                            <input type="checkbox" checked={employee.isOwner} disabled={saving}
                                onChange={(e) => setEmployee({ ...employee, isOwner: e.target.checked })} />
                            Propietario
                        </label>
                        <button type="submit" disabled={saving} className={button + ' bg-[#F5C518]'}>
                            {editing ? 'Guardar cambios' : 'Registrar en nómina'}
                        </button>
                        {editing && <button type="button" disabled={saving} className={button} onClick={reset}>Cancelar</button>}
                    </div>
                </form>

                <ul className="divide-y divide-[#E5E7EB]">
                    {employees?.map((person) => (
                        <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <div>
                                <p className="font-bold">{person.name}{person.isOwner && ' · Propietario'}</p>
                                <p className="text-xs text-[#717784]">{person.role} · {money(person.dailyRate)} / día{!person.active && ' · Inactivo'}</p>
                            </div>
                            <div className="flex gap-1">
                                <button type="button" disabled={saving} className={button + ' border border-[#E5E7EB]'} onClick={() => edit(person)}>Editar</button>
                                <button type="button" disabled={saving} className={button}
                                    onClick={() => void save(() => updateEmployee(person.id, { active: !person.active }))}>
                                    {person.active ? 'Dar de baja' : 'Reactivar'}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            <section className={panel} aria-labelledby="history-heading">
                <h2 id="history-heading" className="text-lg font-bold">Historial de liquidaciones</h2>
                {!history.length && <p className="text-sm text-[#717784]">Todavía no hay liquidaciones registradas.</p>}
                <ul className="divide-y divide-[#E5E7EB]">
                    {history.map((record) => {
                        const oldRecord = legacyIds.has(record.id);
                        const pending = Math.max(0, record.totalLiquidated - record.paidAmount);
                        const state = oldRecord ? 'Liquidación anterior' : closedWeeks.has(record.weekStart) ? 'Cierre registrado' : 'Semana abierta';
                        return (
                            <li key={record.id} className="grid gap-1 py-3 text-sm sm:grid-cols-3 sm:items-center">
                                <div>
                                    <p className="font-bold">{record.employeeName}{record.isOwner && ' · Propietario'}</p>
                                    <p className="text-xs text-[#717784]">{displayDate(record.weekStart)} al {displayDate(record.weekEnd)} · {state}</p>
                                </div>
                                <p>{record.daysWorked.toLocaleString('es-AR')} jorn. · Neto {money(record.totalLiquidated)}</p>
                                <div>
                                    <p>Pagado {money(record.paidAmount)} · <strong>Saldo {money(pending)}</strong></p>
                                    {oldRecord && editingLegacy !== record.id && <div className="mt-2 flex flex-wrap gap-2">
                                        <button type="button" disabled={saving} className={button + ' border border-[#E5E7EB]'}
                                            onClick={() => setEditingLegacy(record.id)}>Editar liquidación</button>
                                        {pending > 0 && <button type="button" disabled={saving}
                                            className={button + ' bg-[#171717] text-[#F5C518]'}
                                            onClick={() => void save(() => markPayrollPaid(record.id, record.totalLiquidated))}>
                                            Saldar pago anterior
                                        </button>}
                                    </div>}
                                </div>
                                {oldRecord && editingLegacy === record.id && (
                                    <LegacyPayrollForm record={record} employees={employees ?? []} works={works ?? []}
                                        legacy={legacy ?? []} journals={journals ?? []} onClose={() => setEditingLegacy('')} />
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
};

export default EmployeesPage;
