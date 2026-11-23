// src/pages/employees/EmployeesPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Employee, PayrollRecord } from '../../types';
import {
    subscribeToEmployees,
    createEmployee,
    deleteEmployee,
    subscribeToPayrolls,
    createPayrollRecord,
    markPayrollPaid,
} from '../../services/firestore/employeesService';
import { calculatePayroll } from '../../utils/calculations';

export const EmployeesPage: React.FC = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [empName, setEmpName] = useState('');
    const [empRole, setEmpRole] = useState('Oficial / Operario');
    const [empRate, setEmpRate] = useState('30000');

    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [daysWorked, setDaysWorked] = useState('5');
    const [advances, setAdvances] = useState('0');
    const [reimbursements, setReimbursements] = useState('0');
    const [paidAmount, setPaidAmount] = useState('0');
    const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10));
    const [weekEnd, setWeekEnd] = useState(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        if (!user) return;
        const unsubEmp = subscribeToEmployees(
            user.uid,
            (data) => {
                setEmployees(data);
                setSelectedEmpId((prev) => prev || (data.length > 0 ? data[0].id : ''));
            },
            (err) => setError(err.message)
        );

        const unsubPay = subscribeToPayrolls(
            user.uid,
            (data) => setPayrolls(data),
            (err) => setError(err.message)
        );

        return () => {
            unsubEmp();
            unsubPay();
        };
    }, [user]);

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !empName.trim()) return;
        try {
            await createEmployee({
                userId: user.uid,
                name: empName.trim(),
                role: empRole.trim() || 'Operario',
                dailyRate: Number(empRate) || 0,
                active: true,
            });
            setEmpName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar empleado.');
        }
    };

    const handleSeedInitialStaff = async () => {
        if (!user) return;
        const initial = [
            { name: 'Esteban', role: 'Oficial Principal', dailyRate: 32000 },
            { name: 'Gonzalo', role: 'Medio Oficial', dailyRate: 28000 },
            { name: 'Franco', role: 'Ayudante Operativo', dailyRate: 25000 },
        ];
        for (const item of initial) {
            await createEmployee({
                userId: user.uid,
                name: item.name,
                role: item.role,
                dailyRate: item.dailyRate,
                active: true,
            });
        }
    };

    const selectedEmployee = employees.find((e) => e.id === selectedEmpId);
    const previewCalc = calculatePayroll({
        daysWorked: Number(daysWorked) || 0,
        dailyRate: selectedEmployee?.dailyRate || 0,
        advances: Number(advances) || 0,
        reimbursements: Number(reimbursements) || 0,
        paidAmount: Number(paidAmount) || 0,
    });

    const handleCreatePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedEmployee) return;
        try {
            await createPayrollRecord({
                userId: user.uid,
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name,
                weekStart,
                weekEnd,
                daysWorked: Number(daysWorked) || 0,
                dailyRate: selectedEmployee.dailyRate,
                advances: Number(advances) || 0,
                reimbursements: Number(reimbursements) || 0,
                totalLiquidated: previewCalc.totalLiquidated,
                paidAmount: Number(paidAmount) || 0,
                status: previewCalc.status,
            });
            setAdvances('0');
            setReimbursements('0');
            setPaidAmount('0');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar liquidación.');
        }
    };

    const totalLiquidatedSum = payrolls.reduce((acc, p) => acc + p.totalLiquidated, 0);
    const totalPaidSum = payrolls.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalPendingDebt = payrolls.reduce(
        (acc, p) => acc + Math.max(0, p.totalLiquidated - p.paidAmount),
        0
    );

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Empleados y Liquidación de Jornales
                    </h1>
                    <p className="text-xs text-[#717784] mt-0.5">
                        Administración de plantel, cálculo automático de días trabajados, adelantos y reintegros
                    </p>
                </div>

                {employees.length === 0 && (
                    <button
                        type="button"
                        onClick={handleSeedInitialStaff}
                        className="px-4 py-2.5 bg-[#171717] hover:bg-[#252525] text-[#F5C518] font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                        Cargar Plantel Inicial (Esteban, Gonzalo y Franco)
                    </button>
                )}
            </div>

            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                    {error}
                </div>
            )}

            {/* Indicadores de Personal y Pagos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs">
                    <span className="text-xs font-medium text-[#717784]">Plantel Activo</span>
                    <p className="text-xl font-extrabold font-mono-num text-[#171717] mt-1">
                        {employees.length} empleados
                    </p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs">
                    <span className="text-xs font-medium text-[#717784]">Total Liquidado</span>
                    <p className="text-xl font-extrabold font-mono-num text-[#171717] mt-1">
                        ${totalLiquidatedSum.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs">
                    <span className="text-xs font-medium text-[#717784]">Pagos Abonados</span>
                    <p className="text-xl font-extrabold font-mono-num text-emerald-700 mt-1">
                        ${totalPaidSum.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-[#171717] text-white rounded-xl p-4 shadow-2xs">
                    <span className="text-xs font-medium text-neutral-400">Saldo Pendiente a Pagar</span>
                    <p className="text-xl font-extrabold font-mono-num text-[#F5C518] mt-1">
                        ${totalPendingDebt.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Formularios de Alta de Personal y Liquidación Semanal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Plantel y Alta de Empleado (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-5">
                    <div className="border-b border-[#E5E7EB] pb-3">
                        <h2 className="text-base font-bold text-[#171717]">Nómina de Empleados</h2>
                        <p className="text-xs text-[#717784]">Configuración de valor de jornal diario</p>
                    </div>

                    <form onSubmit={handleCreateEmployee} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[#171717] mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={empName}
                                    onChange={(e) => setEmpName(e.target.value)}
                                    placeholder="Ej. Esteban"
                                    className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#171717] mb-1">
                                    Rol / Especialidad
                                </label>
                                <input
                                    type="text"
                                    value={empRole}
                                    onChange={(e) => setEmpRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                                />
                            </div>
                        </div>

                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-[#171717] mb-1">
                                    Valor Jornal Diario ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={empRate}
                                    onChange={(e) => setEmpRate(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] font-bold rounded-lg text-xs transition cursor-pointer"
                            >
                                + Registrar
                            </button>
                        </div>
                    </form>

                    <div className="space-y-2.5 pt-2">
                        {employees.map((emp) => (
                            <div
                                key={emp.id}
                                onClick={() => setSelectedEmpId(emp.id)}
                                className={`p-3.5 rounded-lg border flex items-center justify-between transition cursor-pointer ${selectedEmpId === emp.id
                                        ? 'bg-[#F5F6F8] border-[#171717] ring-1 ring-[#F5C518]'
                                        : 'bg-white border-[#E5E7EB] hover:bg-[#F5F6F8]/60'
                                    }`}
                            >
                                <div>
                                    <p className="text-xs font-bold text-[#171717]">{emp.name}</p>
                                    <p className="text-[11px] text-[#717784]">{emp.role}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono-num font-bold text-[#171717] bg-white px-2.5 py-1 rounded border border-[#E5E7EB]">
                                        ${emp.dailyRate.toLocaleString('es-AR')} / día
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteEmployee(emp.id);
                                        }}
                                        className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                                    >
                                        Baja
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Calculadora y Liquidación de Semana (7 cols) */}
                <form
                    onSubmit={handleCreatePayroll}
                    className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4"
                >
                    <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-[#171717]">
                                Liquidación Semanal de Jornales
                            </h2>
                            <p className="text-xs text-[#717784]">
                                Fórmula MYD: (Días × Jornal) − Adelantos + Reintegros
                            </p>
                        </div>
                        {selectedEmployee && (
                            <span className="px-2.5 py-1 rounded bg-[#171717] text-[#F5C518] text-xs font-bold">
                                {selectedEmployee.name}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">Empleado</label>
                            <select
                                value={selectedEmpId}
                                onChange={(e) => setSelectedEmpId(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#171717]"
                            >
                                {employees.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name} (${e.dailyRate.toLocaleString('es-AR')}/día)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Inicio Semana
                            </label>
                            <input
                                type="date"
                                value={weekStart}
                                onChange={(e) => setWeekStart(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Cierre Viernes
                            </label>
                            <input
                                type="date"
                                value={weekEnd}
                                onChange={(e) => setWeekEnd(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Días Trabajados
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="7"
                                step="0.5"
                                value={daysWorked}
                                onChange={(e) => setDaysWorked(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Adelantos ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={advances}
                                onChange={(e) => setAdvances(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Reintegros ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={reimbursements}
                                onChange={(e) => setReimbursements(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Abonado Hoy ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                    </div>

                    {/* Panel de Previsualización Contable */}
                    <div className="p-4 rounded-xl bg-[#171717] text-white grid grid-cols-3 gap-4">
                        <div>
                            <span className="text-[11px] text-neutral-400 block">Jornal Bruto</span>
                            <span className="text-sm font-bold font-mono-num text-white">
                                ${previewCalc.grossPay.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-neutral-400 block">Total Neto a Liquidar</span>
                            <span className="text-base font-extrabold font-mono-num text-[#F5C518]">
                                ${previewCalc.totalLiquidated.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-neutral-400 block">Saldo Pendiente</span>
                            <span className="text-sm font-bold font-mono-num text-amber-300">
                                ${previewCalc.pendingBalance.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!selectedEmployee}
                        className="w-full py-2.5 bg-[#F5C518] hover:bg-[#E0AD00] disabled:opacity-50 text-[#171717] font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                        Registrar Liquidación de Jornal
                    </button>
                </form>
            </div>

            {/* Historial de Liquidaciones */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs">
                <h2 className="text-base font-bold text-[#171717] mb-4">
                    Historial de Liquidaciones y Estado de Pagos
                </h2>
                {payrolls.length === 0 ? (
                    <p className="text-xs text-[#717784] py-6 text-center">
                        No hay liquidaciones registradas todavía.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] text-[#717784] bg-[#F5F6F8]">
                                    <th className="py-3 px-3 font-semibold">Empleado</th>
                                    <th className="py-3 px-3 font-semibold">Período</th>
                                    <th className="py-3 px-3 font-semibold">Días</th>
                                    <th className="py-3 px-3 font-semibold">Adelantos / Reint.</th>
                                    <th className="py-3 px-3 font-semibold">Total Liquidado</th>
                                    <th className="py-3 px-3 font-semibold">Pagado</th>
                                    <th className="py-3 px-3 font-semibold">Pendiente</th>
                                    <th className="py-3 px-3 font-semibold">Estado</th>
                                    <th className="py-3 px-3 font-semibold text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {payrolls.map((p) => {
                                    const pending = Math.max(0, p.totalLiquidated - p.paidAmount);
                                    return (
                                        <tr key={p.id} className="hover:bg-[#F5F6F8]/60 transition">
                                            <td className="py-3 px-3 font-bold text-[#171717]">{p.employeeName}</td>
                                            <td className="py-3 px-3 font-mono-num text-[#717784]">
                                                {p.weekStart} → {p.weekEnd}
                                            </td>
                                            <td className="py-3 px-3 font-mono-num">{p.daysWorked}d</td>
                                            <td className="py-3 px-3 font-mono-num text-[#717784]">
                                                -${p.advances.toLocaleString('es-AR')} / +$
                                                {p.reimbursements.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3 font-mono-num font-bold text-[#171717]">
                                                ${p.totalLiquidated.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3 font-mono-num text-emerald-700 font-semibold">
                                                ${p.paidAmount.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3 font-mono-num font-bold text-amber-700">
                                                ${pending.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.status === 'paid'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : p.status === 'partial'
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                : 'bg-red-50 text-red-700 border-red-200'
                                                        }`}
                                                >
                                                    {p.status === 'paid'
                                                        ? 'Pagado'
                                                        : p.status === 'partial'
                                                            ? 'Parcial'
                                                            : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                {p.status !== 'paid' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markPayrollPaid(p.id, p.totalLiquidated)}
                                                        className="px-3 py-1 bg-[#171717] hover:bg-[#252525] text-[#F5C518] rounded-md text-[11px] font-bold transition cursor-pointer"
                                                    >
                                                        Saldar Pago
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeesPage;