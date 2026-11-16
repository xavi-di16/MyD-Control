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
    registerPayrollPayment,
    deletePayrollRecord,
} from '../../services/firestore/employeesService';
import { calculatePayroll } from '../../utils/calculations';

export const EmployeesPage: React.FC = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [empName, setEmpName] = useState('');
    const [empRole, setEmpRole] = useState('Oficial / Operario');
    const [empRate, setEmpRate] = useState('30000');

    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10));
    const [weekEnd, setWeekEnd] = useState(() => new Date().toISOString().slice(0, 10));
    const [daysWorked, setDaysWorked] = useState('5');
    const [advances, setAdvances] = useState('0');
    const [reimbursements, setReimbursements] = useState('0');
    const [paidAmount, setPaidAmount] = useState('0');

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const unsubEmp = subscribeToEmployees(
            user.uid,
            (empData) => {
                setEmployees(empData);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        const unsubPay = subscribeToPayrolls(
            user.uid,
            (payData) => setPayrolls(payData),
            (err) => setError(err.message)
        );

        return () => {
            unsubEmp();
            unsubPay();
        };
    }, [user]);

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !empName.trim()) return;
        try {
            await createEmployee({
                userId: user.uid,
                name: empName,
                role: empRole,
                dailyRate: Number(empRate) || 0,
            });
            setEmpName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar empleado.');
        }
    };

    const handleSeedTeam = async () => {
        if (!user) return;
        const baseTeam = [
            { name: 'Esteban', role: 'Oficial', dailyRate: 32000 },
            { name: 'Gonzalo', role: 'Medio Oficial', dailyRate: 28000 },
            { name: 'Franco', role: 'Ayudante', dailyRate: 25000 },
        ];
        for (const member of baseTeam) {
            const exists = employees.some(
                (e) => e.name.toLowerCase() === member.name.toLowerCase()
            );
            if (!exists) {
                await createEmployee({ userId: user.uid, ...member });
            }
        }
    };

    const selectedEmp = employees.find((e) => e.id === selectedEmpId);
    const previewCalc = calculatePayroll({
        daysWorked: Number(daysWorked) || 0,
        dailyRate: selectedEmp ? selectedEmp.dailyRate : 0,
        advances: Number(advances) || 0,
        reimbursements: Number(reimbursements) || 0,
        paidAmount: Number(paidAmount) || 0,
    });

    const handleCreatePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedEmp) return;
        try {
            await createPayrollRecord({
                userId: user.uid,
                employeeId: selectedEmp.id,
                employeeName: selectedEmp.name,
                weekStart,
                weekEnd,
                daysWorked: Number(daysWorked) || 0,
                dailyRate: selectedEmp.dailyRate,
                advances: Number(advances) || 0,
                reimbursements: Number(reimbursements) || 0,
                paidAmount: Number(paidAmount) || 0,
            });
            setAdvances('0');
            setReimbursements('0');
            setPaidAmount('0');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar liquidación.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Empleados y Liquidación de Jornales</h1>
                    <p className="text-sm text-slate-400">
                        Cálculo automático de días trabajados, adelantos, reintegros y saldos pendientes
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSeedTeam}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                    Cargar Plantel Inicial (Esteban, Gonzalo y Franco)
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                    onSubmit={handleAddEmployee}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
                >
                    <h2 className="text-base font-semibold text-white">Registrar Empleado</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Nombre *</label>
                            <input
                                type="text"
                                required
                                value={empName}
                                onChange={(e) => setEmpName(e.target.value)}
                                placeholder="Ej. Esteban"
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Rol / Categoría</label>
                            <input
                                type="text"
                                value={empRole}
                                onChange={(e) => setEmpRole(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Valor Jornal ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={empRate}
                                onChange={(e) => setEmpRate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                        Guardar Empleado
                    </button>

                    <div className="pt-3 border-t border-slate-800 space-y-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase">Personal Activo</h3>
                        {loading ? (
                            <p className="text-xs text-slate-500">Cargando personal...</p>
                        ) : employees.length === 0 ? (
                            <p className="text-xs text-slate-500">Aún no hay empleados registrados.</p>
                        ) : (
                            employees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs"
                                >
                                    <div>
                                        <span className="font-semibold text-white">{emp.name}</span>{' '}
                                        <span className="text-slate-400">({emp.role})</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-amber-400 font-semibold">
                                            ${emp.dailyRate.toLocaleString('es-AR')} / día
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => deleteEmployee(emp.id)}
                                            className="text-red-400 hover:underline cursor-pointer"
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </form>

                <form
                    onSubmit={handleCreatePayroll}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
                >
                    <h2 className="text-base font-semibold text-white">Liquidar Semana / Jornales</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs text-slate-300 mb-1">Seleccionar Empleado *</label>
                            <select
                                required
                                value={selectedEmpId}
                                onChange={(e) => setSelectedEmpId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            >
                                <option value="">-- Selecciona un empleado --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} (${emp.dailyRate.toLocaleString('es-AR')}/día)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Inicio Semana</label>
                            <input
                                type="date"
                                value={weekStart}
                                onChange={(e) => setWeekStart(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Fin Semana (Viernes)</label>
                            <input
                                type="date"
                                value={weekEnd}
                                onChange={(e) => setWeekEnd(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Días trabajados</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={daysWorked}
                                onChange={(e) => setDaysWorked(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Adelantos (-)</label>
                            <input
                                type="number"
                                min="0"
                                value={advances}
                                onChange={(e) => setAdvances(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Reintegros (+)</label>
                            <input
                                type="number"
                                min="0"
                                value={reimbursements}
                                onChange={(e) => setReimbursements(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Monto abonado hoy ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Jornal Bruto:</span>
                            <span className="text-white font-medium">
                                ${previewCalc.grossPay.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total a Liquidar (Bruto - Adelantos + Reintegros):</span>
                            <span className="text-amber-400 font-bold">
                                ${previewCalc.totalLiquidated.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Saldo Pendiente tras pago:</span>
                            <span className="text-emerald-400 font-semibold">
                                ${previewCalc.pendingBalance.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!selectedEmp}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                        Registrar Liquidación Semanal
                    </button>
                </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-4">Historial de Liquidaciones y Saldos</h2>
                {payrolls.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay liquidaciones registradas todavía.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 pr-3">Empleado</th>
                                    <th className="py-2 px-3">Período</th>
                                    <th className="py-2 px-3">Días</th>
                                    <th className="py-2 px-3">Adelantos / Reint.</th>
                                    <th className="py-2 px-3">Total Liquidado</th>
                                    <th className="py-2 px-3">Pagado</th>
                                    <th className="py-2 px-3">Pendiente</th>
                                    <th className="py-2 pl-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {payrolls.map((rec) => {
                                    const pending = Math.max(0, rec.totalLiquidated - rec.paidAmount);
                                    return (
                                        <tr key={rec.id}>
                                            <td className="py-2.5 pr-3 font-semibold text-white">{rec.employeeName}</td>
                                            <td className="py-2.5 px-3 text-slate-400">
                                                {rec.weekStart} a {rec.weekEnd}
                                            </td>
                                            <td className="py-2.5 px-3">{rec.daysWorked}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="text-red-300">-${rec.advances.toLocaleString('es-AR')}</span>{' '}
                                                /{' '}
                                                <span className="text-emerald-300">
                                                    +${rec.reimbursements.toLocaleString('es-AR')}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-amber-400">
                                                ${rec.totalLiquidated.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-2.5 px-3 text-emerald-400">
                                                ${rec.paidAmount.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-red-300">
                                                ${pending.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-2.5 pl-3 flex items-center gap-2">
                                                {pending > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => registerPayrollPayment(rec, rec.totalLiquidated)}
                                                        className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 cursor-pointer"
                                                    >
                                                        Saldar
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => deletePayrollRecord(rec.id)}
                                                    className="text-red-400 hover:underline cursor-pointer"
                                                >
                                                    Eliminar
                                                </button>
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