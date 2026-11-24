import { useRef, useState } from 'react';
import type { AttendanceStatus, Employee, PayrollEntry, PayrollEntryKind, PayrollRecord, WeeklyClosure, WeeklyJournal, Work } from '../../types';
import { closeWeek, registerJournalEntry, saveAttendance } from '../../services/firestore/attendanceService';
import { addDays, displayDate, journalLabor, mondayOf, money, summarizeJournal, todayInArgentina } from '../../utils/attendance';

const panel = 'space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6';
const control = 'min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] disabled:opacity-50';
const primary = 'min-h-11 rounded-lg bg-[#F5C518] px-4 text-sm font-bold text-[#171717] disabled:opacity-50';
const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const statusLabels: Record<AttendanceStatus, { label: string; short: string }> = {
    present: { label: 'Presente', short: 'P' },
    half: { label: 'Media jornada', short: '½' },
    absent: { label: 'Ausente', short: 'A' },
    pending: { label: 'Pendiente', short: '–' },
};
const entryLabels: Record<PayrollEntryKind, string> = {
    advance: 'Adelanto',
    reimbursement: 'Reintegro',
    payment: 'Pago',
};

const WeeklySettlement = ({ employee, journal, weekStart, today }: {
    employee: Employee; journal?: WeeklyJournal; weekStart: string; today: string;
}) => {
    const totals = summarizeJournal(journal);
    const [date, setDate] = useState(today);
    const [kind, setKind] = useState<PayrollEntryKind>('advance');
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef<PayrollEntry | undefined>(undefined);
    const busy = useRef(false);

    const register = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy.current) return;
        const input = { kind, date, amount: Number(amount), reference: reference.trim() };
        const previous = pending.current;
        const sameEntry = previous && previous.kind === kind && previous.date === date
            && previous.amount === input.amount && previous.reference === input.reference;
        const entry = sameEntry ? previous : { ...input, id: crypto.randomUUID() };
        pending.current = entry;
        busy.current = true;
        setSaving(true);
        setError('');
        try {
            await registerJournalEntry(employee.userId, employee.id, weekStart, entry);
            pending.current = undefined;
            setAmount('');
            setReference('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return (
        <div className="mt-3 space-y-3 border-t border-[#E5E7EB] pt-3">
            <dl className="grid grid-cols-2 gap-2 rounded-lg bg-[#171717] p-3 text-sm text-white sm:grid-cols-3">
                {([
                    ['Jornal bruto', totals.grossPay],
                    ['Adelantos', totals.advances],
                    ['Reintegros', totals.reimbursements],
                    ['Neto a liquidar', totals.totalLiquidated],
                    ['Pagado', totals.paidAmount],
                    ['Saldo pendiente', totals.pendingBalance],
                ] as const).map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-xs text-neutral-300">{label}</dt>
                        <dd className="font-bold text-[#F5C518]">{money(value)}</dd>
                    </div>
                ))}
            </dl>
            {totals.weekendGross > 0 && <p className="text-sm">Extra del sábado y domingo incluido en el bruto: <strong>{money(totals.weekendGross)}</strong></p>}
            {totals.overpaid > 0 && <p className="text-sm text-amber-800">Importe a favor por pagos o adelantos: <strong>{money(totals.overpaid)}</strong></p>}
            <form onSubmit={register} className="space-y-2">
                <fieldset disabled={saving} className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <label className="grid min-w-0 gap-1 text-xs font-semibold">
                        Movimiento
                        <select className={control} value={kind} onChange={(e) => setKind(e.target.value as PayrollEntryKind)}>
                            {Object.entries(entryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-semibold">
                        Importe ($)
                        <input className={control} type="number" min="0.01" step="0.01" value={amount} required onChange={(e) => setAmount(e.target.value)} />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-semibold">
                        Fecha del movimiento
                        <input className={control} type="date" max={today} value={date} required onChange={(e) => setDate(e.target.value)} />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs font-semibold">
                        Comprobante (opcional)
                        <input className={control} value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} />
                    </label>
                </fieldset>
                <p className="text-xs text-[#717784]">Los pagos y adelantos registrados se cargan automáticamente en Caja MYD.</p>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <button type="submit" className={primary} disabled={saving}>{saving ? 'Guardando…' : 'Registrar movimiento'}</button>
            </form>
            {!!journal?.entries.length && (
                <ul className="divide-y divide-[#E5E7EB] text-sm" aria-label="Movimientos de la liquidación">
                    {journal.entries.map((entry) => (
                        <li key={entry.id} className="flex flex-wrap justify-between gap-1 py-2">
                            <span>{displayDate(entry.date)} · {entryLabels[entry.kind]}{entry.reference && ' · ' + entry.reference}</span>
                            <strong>{money(entry.amount)}</strong>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export const AttendanceWeek = ({ userId, employees, journals, closures, legacy, works }: {
    userId: string;
    employees: Employee[];
    journals: WeeklyJournal[];
    closures: WeeklyClosure[];
    legacy: PayrollRecord[];
    works: Work[];
}) => {
    const today = todayInArgentina();
    const [date, setDate] = useState(today);
    const [saving, setSaving] = useState<string[]>([]);
    const [error, setError] = useState('');
    const operations = useRef(new Set<string>());
    const weekStart = mondayOf(date);
    const friday = addDays(weekStart, 4);
    const sunday = addDays(weekStart, 6);
    const closed = closures.some((item) => item.weekStart === weekStart);
    const weekJournals = journals.filter((journal) => journal.weekStart === weekStart);
    const journalsByEmployee = new Map(weekJournals.map((journal) => [journal.employeeId, journal]));
    const oldPayrolls = legacy.filter((record) => record.weekStart <= sunday && record.weekEnd >= weekStart);
    const people = new Map(employees.filter((person) => person.active).map((person) => [person.id, person]));
    for (const journal of weekJournals) {
        const employee = employees.find((person) => person.id === journal.employeeId);
        people.set(journal.employeeId, employee ?? {
            id: journal.employeeId, userId, name: journal.employeeName, isOwner: journal.isOwner,
            role: '', dailyRate: 0, active: false, createdAt: journal.createdAt,
        });
    }

    const workTotals = new Map<string, { name: string; staff: number; owner: number }>();
    for (const day of journalLabor(weekJournals)) {
        const total = workTotals.get(day.workId) ?? { name: day.workName || 'Sin obra asignada', staff: 0, owner: 0 };
        if (day.isOwner) total.owner += day.amount;
        else total.staff += day.amount;
        workTotals.set(day.workId, total);
    }

    const save = async (key: string, action: () => Promise<void>) => {
        if (operations.current.has(key)) return;
        operations.current.add(key);
        setSaving([...operations.current]);
        setError('');
        try {
            await action();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
        } finally {
            operations.current.delete(key);
            setSaving([...operations.current]);
        }
    };

    const updateAttendance = (employee: Employee, status: AttendanceStatus, workId?: string) => {
        const journal = journalsByEmployee.get(employee.id);
        const previous = journal?.days[date];
        if (closed && date <= friday && !window.confirm('La semana ya está cerrada. ¿Querés corregir esta asistencia?')) return;
        const work = works.find((work) => work.id === workId);
        void save(employee.id, () => saveAttendance({
            userId, employeeId: employee.id, date, status, previous,
            work: workId === undefined ? undefined : { id: workId, name: work?.name ?? '' },
        }));
    };

    return (
        <section className={panel} aria-labelledby="attendance-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="attendance-heading" className="text-lg font-bold text-[#171717]">Asistencia semanal</h2>
                    <p className="text-sm text-[#717784]">{displayDate(weekStart)} al {displayDate(sunday)}</p>
                </div>
                {closed ? <p className="rounded-lg bg-[#171717] p-2 text-sm font-semibold text-[#F5C518]">Cierre del viernes registrado</p> : (
                    <button className={primary} type="button" disabled={friday > today || saving.includes(weekStart)}
                        onClick={() => void save(weekStart, () => closeWeek(userId, weekStart))}>
                        Cerrar semana
                    </button>
                )}
            </div>
            <div className="flex flex-wrap items-end gap-2">
                <button className={control} type="button" aria-label="Semana anterior" onClick={() => setDate(addDays(weekStart, -7))}>←</button>
                <label className="grid min-w-0 gap-1 text-xs font-semibold">
                    Fecha de asistencia
                    <input type="date" className={control} value={date} max={today}
                        onChange={(e) => { if (e.target.value && e.target.value <= today) setDate(e.target.value); }} />
                </label>
                <button className={control} type="button" aria-label="Semana siguiente" disabled={sunday >= today}
                    onClick={() => setDate(addDays(weekStart, 7))}>→</button>
                <button className={control} type="button" onClick={() => setDate(today)}>Hoy</button>
            </div>
            {closed && <p className="text-sm text-[#717784]">El sábado y el domingo todavía se pueden cargar. Los extras actualizan el saldo de esta semana.</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {!people.size && <p className="text-sm text-[#717784]">Registrá personal en la nómina para cargar su asistencia.</p>}

            {[false, true].map((isOwner) => {
                const group = [...people.values()].filter((employee) => (
                    journalsByEmployee.get(employee.id)?.isOwner ?? employee.isOwner ?? false
                ) === isOwner);
                if (!group.length) return null;
                const summaries = group.map((employee) => ({
                    employee,
                    journal: journalsByEmployee.get(employee.id),
                    totals: summarizeJournal(journalsByEmployee.get(employee.id)),
                }));
                const gross = summaries.reduce((sum, { totals }) => sum + totals.grossPay, 0);
                const pending = summaries.reduce((sum, { totals }) => sum + totals.pendingBalance, 0);
                return (
                    <div key={String(isOwner)} className="space-y-2">
                        <h3 className="flex flex-wrap justify-between gap-1 font-bold text-[#171717]">
                            <span>{isOwner ? 'Trabajo del propietario' : 'Jornales de empleados'}</span>
                            <span className="text-sm">Bruto {money(gross)} · Saldo {money(pending)}</span>
                        </h3>
                        {summaries.map(({ employee, journal, totals }) => {
                            const current = journal?.days[date];
                            const previousPeriods = oldPayrolls.filter((record) => record.employeeId === employee.id);
                            const alreadySettled = previousPeriods.some((record) => record.weekStart <= date && record.weekEnd >= date);
                            const disabled = date > today || saving.includes(employee.id);
                            return (
                                <article key={employee.id} aria-label={employee.name} className="space-y-3 rounded-lg border border-[#E5E7EB] p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-1">
                                        <h4 className="font-bold">{journal?.employeeName ?? employee.name}</h4>
                                        <p className="text-sm"><strong>{totals.daysWorked.toLocaleString('es-AR')}</strong> jorn. · <strong>{money(totals.grossPay)}</strong></p>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1" aria-label={'Planilla de ' + employee.name}>
                                        {weekdayNames.map((day, index) => {
                                            const cellDate = addDays(weekStart, index);
                                            const status = journal?.days[cellDate]?.status ?? 'pending';
                                            const selected = cellDate === date;
                                            return (
                                                <button type="button" key={day} disabled={cellDate > today}
                                                    aria-label={day + ' ' + displayDate(cellDate) + ': ' + statusLabels[status].label}
                                                    aria-pressed={selected} onClick={() => setDate(cellDate)}
                                                    className={'flex min-h-11 min-w-0 flex-col items-center rounded-md border px-0.5 py-1 text-xs disabled:opacity-40 ' +
                                                        (selected ? 'border-[#171717] bg-[#F5C518] text-[#171717]' : 'border-[#E5E7EB] bg-[#F5F6F8]')}>
                                                    <span>{day} {cellDate.slice(-2)}</span><strong>{statusLabels[status].short}</strong>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {alreadySettled ? <p className="text-sm text-[#717784]">Este día está cubierto por una liquidación anterior del historial.</p> : (
                                        <>
                                            <div className="flex flex-wrap gap-1.5" aria-label={'Asistencia del ' + displayDate(date)}>
                                                {Object.entries(statusLabels).map(([status, { label }]) => {
                                                    const selected = (current?.status ?? 'pending') === status;
                                                    return <button key={status} type="button" disabled={disabled || selected}
                                                        aria-pressed={selected} onClick={() => updateAttendance(employee, status as AttendanceStatus)}
                                                        className={'min-h-11 rounded-lg border px-2.5 text-xs font-semibold disabled:cursor-default ' +
                                                            (selected ? 'border-[#171717] bg-[#171717] text-[#F5C518]' : 'border-[#E5E7EB] bg-white disabled:opacity-50')}>
                                                        {label}
                                                    </button>;
                                                })}
                                            </div>
                                            {(current?.status === 'present' || current?.status === 'half') && (
                                                <label className="flex flex-wrap items-center gap-2 text-sm">
                                                    Obra
                                                    <select className={control + ' min-w-0 max-w-full'} value={current.workId} disabled={disabled}
                                                        onChange={(e) => updateAttendance(employee, current.status, e.target.value)}>
                                                        <option value="">Sin obra asignada</option>
                                                        {works.map((work) => <option key={work.id} value={work.id}>{work.name}</option>)}
                                                        {current.workId && !works.some((work) => work.id === current.workId) &&
                                                            <option value={current.workId}>{current.workName || 'Obra archivada'}</option>}
                                                    </select>
                                                    <span className="text-xs text-[#717784]">{money(current.dailyRate ?? 0)} / día registrado</span>
                                                </label>
                                            )}
                                        </>
                                    )}
                                    {(!previousPeriods.length || totals.daysWorked > 0 || !!journal?.entries.length) && (
                                        <details className="rounded-lg bg-[#F5F6F8] p-3">
                                            <summary className="cursor-pointer text-sm font-semibold">
                                                {previousPeriods.length ? 'Liquidación adicional' : 'Liquidación'} · saldo {money(totals.pendingBalance)}
                                            </summary>
                                            <WeeklySettlement key={weekStart} employee={employee} journal={journal} weekStart={weekStart} today={today} />
                                        </details>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                );
            })}
            {!!workTotals.size && (
                <div className="border-t border-[#E5E7EB] pt-3">
                    <h3 className="font-bold">Costos de esta semana por obra</h3>
                    <ul className="divide-y divide-[#E5E7EB] text-sm">
                        {[...workTotals.entries()].map(([id, total]) => (
                            <li key={id} className="flex flex-wrap justify-between gap-1 py-2">
                                <span className="font-semibold">{works.find((work) => work.id === id)?.name ?? total.name}</span>
                                <span>Empleados {money(total.staff)} · Propietario {money(total.owner)} · <strong>Total {money(total.staff + total.owner)}</strong></span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};
