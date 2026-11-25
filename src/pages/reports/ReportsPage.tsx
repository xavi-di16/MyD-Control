// src/pages/reports/ReportsPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Movement, PayrollRecord, Work, Task, WeeklyJournal } from '../../types';
import { subscribeToMovements } from '../../services/firestore/financeService';
import { subscribeToPayrolls } from '../../services/firestore/employeesService';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { subscribeToUserTasks } from '../../services/firestore/tasksService';
import { subscribeToJournals } from '../../services/firestore/attendanceService';
import { journalLabor, money, todayInArgentina } from '../../utils/attendance';
import { sendTasksSummaryEmail } from '../../services/email/emailService';

export const ReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [movements, setMovements] = useState<Movement[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [journals, setJournals] = useState<WeeklyJournal[]>([]);

    const [startDate, setStartDate] = useState(() => todayInArgentina().slice(0, 8) + '01');
    const [endDate, setEndDate] = useState(todayInArgentina);
    const [observations, setObservations] = useState('');
    const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
        null
    );
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (!user) return;
        const u1 = subscribeToMovements(user.uid, setMovements, () => { });
        const u2 = subscribeToPayrolls(user.uid, setPayrolls, () => { });
        const u3 = subscribeToWorks(user.uid, setWorks, () => { });
        const u4 = subscribeToUserTasks(user.uid, setTasks, () => { });
        const u5 = subscribeToJournals(user.uid, setJournals, () => { });
        return () => {
            u1();
            u2();
            u3();
            u4();
            u5();
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
        (acc, p) => acc + (p.isOwner ? 0 : Math.max(0, p.totalLiquidated - p.paidAmount)),
        0
    );
    const periodLabor = journalLabor(journals).filter((day) => day.date >= startDate && day.date <= endDate);
    const employeeLabor = periodLabor.reduce((sum, day) => sum + (day.isOwner ? 0 : day.amount), 0);
    const ownerLabor = periodLabor.reduce((sum, day) => sum + (day.isOwner ? day.amount : 0), 0);

    const totalPendingCollections = works.reduce(
        (acc, w) => acc + Math.max(0, w.agreedBudget - w.collectedAmount),
        0
    );

    const netBalance = income - mydExpense - householdExpense;

    const reportText = [
        'CIERRE SEMANAL',
        `Período: ${startDate} al ${endDate}`,
        observations.trim(),
    ].filter(Boolean).join('\n\n');

    const internalSummary = [
        'RESUMEN INTERNO DEL PERÍODO',
        `Ingresos: ${money(income)}`,
        `Egresos MYD: ${money(mydExpense)} · Gastos domésticos: ${money(householdExpense)}`,
        `Saldo neto: ${money(netBalance)}`,
        `Jornales pendientes: ${money(totalPayrollPending)} · Cobranzas pendientes: ${money(totalPendingCollections)}`,
        `Costo de asistencia: empleados ${money(employeeLabor)} / propietario ${money(ownerLabor)}`,
    ].join('\n');

    const handleSendTasksEmail = async () => {
        if (!user?.email) {
            setEmailFeedback({
                type: 'error',
                text: 'No se detectó un correo electrónico en tu sesión de usuario.',
            });
            return;
        }
        if (tasks.length === 0) {
            setEmailFeedback({
                type: 'error',
                text: 'No hay tareas cargadas para generar el resumen por correo.',
            });
            return;
        }
        setSendingEmail(true);
        setEmailFeedback(null);
        try {
            const res = await sendTasksSummaryEmail(
                user.email,
                user.displayName || user.email,
                tasks
            );
            setEmailFeedback({ type: 'success', text: res.message });
        } catch (err) {
            setEmailFeedback({
                type: 'error',
                text: err instanceof Error ? err.message : 'Error al enviar correo.',
            });
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Informes y Cierres Semanales
                    </h1>
                    <p className="text-xs text-[#717784] mt-0.5">
                        Auditoría por período, exportación de documento PDF corporativo y notificación por email
                    </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    <Link
                        to="/reports/document"
                        state={{ reportText, internalSummary }}
                        className="px-4 py-2.5 bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                    >
                        Preparar informe PDF
                    </Link>
                    <button
                        type="button"
                        onClick={handleSendTasksEmail}
                        disabled={sendingEmail || tasks.length === 0}
                        className="px-4 py-2.5 bg-[#171717] hover:bg-[#252525] disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                    >
                        {sendingEmail ? 'Enviando...' : 'Enviar Resumen por Email'}
                    </button>
                </div>
            </div>

            {emailFeedback && (
                <div
                    role="status"
                    className={`p-3.5 rounded-lg border text-xs font-medium ${
                        emailFeedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                >
                    {emailFeedback.text}
                </div>
            )}

            {/* Configuración del Período y Observaciones */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                    <span className="w-2 h-4 rounded-xs bg-[#F5C518]" />
                    <h2 className="text-base font-bold text-[#171717]">
                        Parámetros del Período de Cierre
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Fecha Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Fecha Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-[#171717] mb-1">
                        Observaciones Ejecutivas del Administrador (se incluyen en el documento PDF)
                    </label>
                    <textarea
                        rows={2}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Notas sobre entregas de materiales, pagos de clientes o cierres de viernes..."
                        className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                    />
                </div>
            </div>

            {/* Vista Previa del Dossier de Cierre */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-[#171717] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#F5C518]">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5C518] block">
                            VISTA PREVIA DEL INFORME
                        </span>
                        <h3 className="text-sm font-bold">
                            Balance Consolidado ({startDate} al {endDate})
                        </h3>
                    </div>
                    <span className="text-xs font-mono-num text-neutral-400">
                        {periodMovements.length} movimientos en el período
                    </span>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB]">
                        <p className="text-xs font-semibold text-[#717784]">Ingresos del Período</p>
                        <p className="text-xl font-extrabold font-mono-num text-emerald-700 mt-1">
                            +${income.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB]">
                        <p className="text-xs font-semibold text-[#717784]">Gastos MYD / Domésticos</p>
                        <p className="text-xl font-extrabold font-mono-num text-red-600 mt-1">
                            -${mydExpense.toLocaleString('es-AR')} / -${householdExpense.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#171717] text-white">
                        <p className="text-xs font-medium text-neutral-400">Saldo Neto del Período</p>
                        <p className="text-xl font-extrabold font-mono-num text-[#F5C518] mt-1">
                            ${netBalance.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB]">
                        <p className="text-xs font-semibold text-[#717784]">Deuda Pendiente de Jornales</p>
                        <p className="text-xl font-extrabold font-mono-num text-amber-700 mt-1">
                            ${totalPayrollPending.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB]">
                        <p className="text-xs font-semibold text-[#717784]">Cobranzas por Recibir (Obras)</p>
                        <p className="text-xl font-extrabold font-mono-num text-[#171717] mt-1">
                            ${totalPendingCollections.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB]">
                        <p className="text-xs font-semibold text-[#717784]">Cumplimiento de Tareas</p>
                        <p className="text-xl font-extrabold font-mono-num text-[#171717] mt-1">
                            {tasks.filter((t) => t.status === 'completed').length} / {tasks.length} completadas
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F5F6F8] border border-[#E5E7EB]">
                        <p className="text-xs font-semibold text-[#717784]">Costo de asistencia del período</p>
                        <p className="mt-1 text-sm">Empleados <strong>{money(employeeLabor)}</strong></p>
                        <p className="text-sm">Propietario <strong>{money(ownerLabor)}</strong></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
