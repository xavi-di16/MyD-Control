import { useState } from 'react';
import { addDays, displayDate, journalLabor, money } from '../../utils/attendance';

export const WorkLaborCosts = ({ labor, totalRecordedCost, agreedBudget }: {
    labor: ReturnType<typeof journalLabor>; totalRecordedCost: number; agreedBudget: number;
}) => {
    const [selectedWeek, setSelectedWeek] = useState('');
    const weeks = [...new Set(labor.map((day) => day.weekStart))].sort().reverse();
    const currentWeek = weeks.includes(selectedWeek) ? selectedWeek : weeks[0];
    const weekLabor = labor.filter((day) => day.weekStart === currentWeek)
        .sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
    const staffCost = labor.reduce((sum, day) => sum + (day.isOwner ? 0 : day.amount), 0);
    const ownerCost = labor.reduce((sum, day) => sum + (day.isOwner ? day.amount : 0), 0);
    const result = agreedBudget - totalRecordedCost;

    return (
        <section className="space-y-3 border-t border-[#E5E7EB] pt-3" aria-label="Costos laborales de la obra">
            <h4 className="font-bold">Costos laborales y resultado de la obra</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {([
                    ['Jornales de empleados', staffCost],
                    ['Trabajo del propietario', ownerCost],
                    ['Costo registrado total', totalRecordedCost],
                    ['Resultado registrado', result],
                ] as const).map(([label, amount]) => (
                    <div className="rounded-lg bg-[#F5F6F8] p-2" key={label}>
                        <dt className="text-xs text-[#717784]">{label}</dt>
                        <dd className="font-bold">{money(amount)}</dd>
                    </div>
                ))}
            </dl>
            <p className="text-xs text-[#717784]">Resultado sobre el presupuesto acordado, con costos reales de Presupuestos y jornales asignados por asistencia.</p>
            {currentWeek && (
                <details className="rounded-lg border border-[#E5E7EB] p-3">
                    <summary className="cursor-pointer text-sm font-semibold">Detalle diario de personal</summary>
                    <label className="my-2 flex flex-wrap items-center gap-2 text-sm">
                        Semana
                        <select value={currentWeek} onChange={(e) => setSelectedWeek(e.target.value)}
                            className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-2">
                            {weeks.map((week) => <option key={week} value={week}>{displayDate(week)} al {displayDate(addDays(week, 6))}</option>)}
                        </select>
                    </label>
                    <ul className="divide-y divide-[#E5E7EB] text-sm">
                        {weekLabor.map((day) => (
                            <li key={day.date + '_' + day.employeeId} className="flex flex-wrap justify-between gap-1 py-2">
                                <span>{displayDate(day.date)} · {day.employeeName}{day.isOwner && ' · Propietario'}</span>
                                <strong>{day.days.toLocaleString('es-AR')} jorn. · {money(day.amount)}</strong>
                            </li>
                        ))}
                    </ul>
                    <p className="border-t border-[#E5E7EB] pt-2 text-sm font-bold">Total laboral de la semana {money(weekLabor.reduce((sum, day) => sum + day.amount, 0))}</p>
                </details>
            )}
        </section>
    );
};
