// src/pages/reports/ReportsPage.tsx
import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import type { Movement, PayrollRecord, Work, Task } from '../../types';
import { subscribeToMovements } from '../../services/firestore/financeService';
import { subscribeToPayrolls } from '../../services/firestore/employeesService';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { subscribeToUserTasks } from '../../services/firestore/tasksService';
import { sendTasksSummaryEmail } from '../../services/email/emailService';

export const ReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [movements, setMovements] = useState<Movement[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [startDate, setStartDate] = useState('2026-11-01');
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [observations, setObservations] = useState('');
    const [emailStatus, setEmailStatus] = useState<string | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (!user) return;
        const u1 = subscribeToMovements(user.uid, setMovements, () => { });
        const u2 = subscribeToPayrolls(user.uid, setPayrolls, () => { });
        const u3 = subscribeToWorks(user.uid, setWorks, () => { });
        const u4 = subscribeToUserTasks(user.uid, setTasks, () => { });
        return () => {
            u1();
            u2();
            u3();
            u4();
        };
    }, [user]);

    const periodMovements = movements.filter(
        (m) => m.date >= startDate && m.date <= endDate
    );

    const income = periodMovements
        .filter((m) => m.type === 'income')
        .reduce((acc, m) => acc + m.amount, 0);

    const mydExpense = periodMovements
        .filter((m) => m.type === 'expense' && m.account === 'myd')
        .reduce((acc, m) => acc + m.amount, 0);

    const householdExpense = periodMovements
        .filter((m) => m.type === 'expense' && m.account === 'household')
        .reduce((acc, m) => acc + m.amount, 0);

    const totalPayrollPending = payrolls.reduce(
        (acc, p) => acc + Math.max(0, p.totalLiquidated - p.paidAmount),
        0
    );

    const totalPendingCollections = works.reduce(
        (acc, w) => acc + Math.max(0, w.agreedBudget - w.collectedAmount),
        0
    );

    const netBalance = income - mydExpense - householdExpense;

    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('MYD CONTROL - CIERRE E INFORME SEMANAL', 14, 20);

        doc.setFontSize(10);
        doc.text(`Período evaluado: ${startDate} al ${endDate}`, 14, 28);
        doc.text(`Administrador: ${user?.email || 'MYD Admin'}`, 14, 34);

        doc.setFontSize(12);
        doc.text('1. Resumen Financiero del Período', 14, 46);
        doc.setFontSize(10);
        doc.text(`- Ingresos totales: $${income.toLocaleString('es-AR')}`, 18, 54);
        doc.text(`- Egresos operativos MYD: -$${mydExpense.toLocaleString('es-AR')}`, 18, 60);
        doc.text(`- Gastos domésticos: -$${householdExpense.toLocaleString('es-AR')}`, 18, 66);
        doc.text(`- Saldo Neto de Caja: $${netBalance.toLocaleString('es-AR')}`, 18, 72);

        doc.setFontSize(12);
        doc.text('2. Estado de Jornales, Obras y Tareas', 14, 86);
        doc.setFontSize(10);
        doc.text(
            `- Saldos pendientes a empleados: $${totalPayrollPending.toLocaleString('es-AR')}`,
            18,
            94
        );
        doc.text(
            `- Cobranzas pendientes de obras: $${totalPendingCollections.toLocaleString('es-AR')}`,
            18,
            100
        );
        doc.text(
            `- Obras activas: ${works.filter((w) => w.status === 'active').length} de ${works.length}`,
            18,
            106
        );
        doc.text(
            `- Tareas completadas: ${tasks.filter((t) => t.status === 'completed').length} de ${tasks.length}`,
            18,
            112
        );

        if (observations.trim()) {
            doc.setFontSize(12);
            doc.text('3. Observaciones de Cierre', 14, 126);
            doc.setFontSize(10);
            const splitObs = doc.splitTextToSize(observations.trim(), 180);
            doc.text(splitObs, 18, 134);
        }

        doc.save(`MYD-Control-Cierre-${startDate}-a-${endDate}.pdf`);
    };

    const handleSendTasksEmail = async () => {
        if (!user?.email) return;
        setSendingEmail(true);
        setEmailStatus(null);
        try {
            const res = await sendTasksSummaryEmail(
                user.email,
                user.displayName || user.email,
                tasks
            );
            setEmailStatus(res.message);
        } catch (err) {
            setEmailStatus(err instanceof Error ? err.message : 'Error al enviar correo.');
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reportes y Cierres Semanales</h1>
                    <p className="text-sm text-slate-400">
                        Generación de informe PDF descargable y envío de resumen por correo vía AWS SES
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                        Descargar Informe PDF
                    </button>
                    <button
                        type="button"
                        onClick={handleSendTasksEmail}
                        disabled={sendingEmail}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                        {sendingEmail ? 'Enviando...' : 'Enviar Resumen por Email (AWS SES)'}
                    </button>
                </div>
            </div>

            {emailStatus && (
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300">
                    {emailStatus}
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-semibold text-white">Filtro de Período de Cierre</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Fecha Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Fecha Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-slate-300 mb-1">
                        Observaciones del Administrador (se incluyen en el PDF)
                    </label>
                    <textarea
                        rows={2}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Notas sobre entregas de materiales, pagos de clientes o cierres de viernes..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Ingresos del Período</p>
                    <p className="text-lg font-bold text-emerald-400 mt-1">
                        +${income.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Gastos MYD / Domésticos</p>
                    <p className="text-lg font-bold text-red-400 mt-1">
                        -${mydExpense.toLocaleString('es-AR')} / -${householdExpense.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Saldo Neto del Período</p>
                    <p className="text-lg font-bold text-amber-400 mt-1">
                        ${netBalance.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Deuda Pendiente de Jornales</p>
                    <p className="text-lg font-bold text-red-300 mt-1">
                        ${totalPayrollPending.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Cobranzas por Recibir (Obras)</p>
                    <p className="text-lg font-bold text-sky-400 mt-1">
                        ${totalPendingCollections.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Avance de Tareas</p>
                    <p className="text-lg font-bold text-white mt-1">
                        {tasks.filter((t) => t.status === 'completed').length} / {tasks.length} completadas
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;