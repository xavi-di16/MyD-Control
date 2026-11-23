// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Task, Work, Movement, PayrollRecord } from '../../types';
import { subscribeToUserTasks } from '../../services/firestore/tasksService';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { subscribeToMovements } from '../../services/firestore/financeService';
import { subscribeToPayrolls } from '../../services/firestore/employeesService';
import { calculateWorkMetrics } from '../../utils/calculations';

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

    useEffect(() => {
        if (!user) return;
        const u1 = subscribeToUserTasks(user.uid, setTasks, () => { });
        const u2 = subscribeToWorks(user.uid, setWorks, () => { });
        const u3 = subscribeToMovements(user.uid, setMovements, () => { });
        const u4 = subscribeToPayrolls(user.uid, setPayrolls, () => { });
        return () => {
            u1();
            u2();
            u3();
            u4();
        };
    }, [user]);

    const pendingTasks = tasks.filter((t) => t.status !== 'completed');
    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
    const activeWorks = works.filter((w) => w.status === 'active');
    const plannedOrPausedWorks = works.filter(
        (w) => w.status === 'planned' || w.status === 'paused'
    );

    const totalIncome = movements
        .filter((m) => m.type === 'income')
        .reduce((acc, m) => acc + m.amount, 0);
    const totalExpense = movements
        .filter((m) => m.type === 'expense')
        .reduce((acc, m) => acc + m.amount, 0);
    const mydExpense = movements
        .filter((m) => m.type === 'expense' && m.account === 'myd')
        .reduce((acc, m) => acc + m.amount, 0);
    const householdExpense = movements
        .filter((m) => m.type === 'expense' && m.account === 'household')
        .reduce((acc, m) => acc + m.amount, 0);

    const availableCash = totalIncome - totalExpense;

    const pendingPayrolls = payrolls.reduce(
        (acc, p) => acc + Math.max(0, p.totalLiquidated - p.paidAmount),
        0
    );

    const totalAgreedBudget = works.reduce((acc, w) => acc + w.agreedBudget, 0);
    const totalCollected = works.reduce((acc, w) => acc + w.collectedAmount, 0);
    const pendingCollections = works.reduce(
        (acc, w) => acc + Math.max(0, w.agreedBudget - w.collectedAmount),
        0
    );

    const collectionRatePercent =
        totalAgreedBudget > 0 ? Math.min(100, Math.round((totalCollected / totalAgreedBudget) * 100)) : 0;

    return (
        <div className="space-y-6">
            {/* Cabecera Ejecutiva */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#171717] text-[#F5C518] rounded">
                            PANEL EJECUTIVO
                        </span>
                        <span className="text-xs text-[#717784]">
                            Resumen operativo y financiero en tiempo real
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Bienvenido, {user?.displayName || user?.email}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                        to="/tasks"
                        className="px-4 py-2 bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] font-bold rounded-lg text-xs transition shadow-2xs"
                    >
                        + Nueva Tarea
                    </Link>
                    <Link
                        to="/works"
                        className="px-4 py-2 bg-[#171717] hover:bg-[#252525] text-white font-semibold rounded-lg text-xs transition"
                    >
                        Mapa de Obras
                    </Link>
                    <Link
                        to="/reports"
                        className="px-4 py-2 bg-[#F5F6F8] hover:bg-neutral-200 text-[#171717] font-semibold rounded-lg text-xs border border-[#E5E7EB] transition"
                    >
                        Cierre Semanal PDF
                    </Link>
                </div>
            </div>

            {/* Fila Principal de Indicadores (KPI Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Saldo Disponible (Destacado Corporativo) */}
                <div className="bg-[#171717] text-white rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="h-1 w-full bg-[#F5C518] absolute top-0 left-0" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-400">Saldo Disponible en Caja</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#252525] text-[#F5C518]">
                            CAJA GENERAL
                        </span>
                    </div>
                    <p className="text-2xl font-extrabold font-mono-num text-[#F5C518] my-3">
                        ${availableCash.toLocaleString('es-AR')}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-[#252525] pt-2.5">
                        <span>Ing.: +${totalIncome.toLocaleString('es-AR')}</span>
                        <span>Egr.: -${totalExpense.toLocaleString('es-AR')}</span>
                    </div>
                </div>

                {/* KPI 2: Cobranzas y Obras Activas */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#717784]">Obras en Ejecución</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {activeWorks.length} activas
                        </span>
                    </div>
                    <div className="my-3">
                        <p className="text-2xl font-extrabold font-mono-num text-[#171717]">
                            ${pendingCollections.toLocaleString('es-AR')}
                        </p>
                        <p className="text-[11px] text-[#717784] mt-0.5">Saldo pendiente por cobrar</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#717784] border-t border-[#E5E7EB] pt-2.5">
                        <span>{works.length} obras registradas</span>
                        <span className="font-semibold text-[#171717]">{plannedOrPausedWorks.length} en espera</span>
                    </div>
                </div>

                {/* KPI 3: Personal y Jornales */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#717784]">Pasivo de Jornales</span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${pendingPayrolls > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                        >
                            {pendingPayrolls > 0 ? 'Por saldar' : 'Al día'}
                        </span>
                    </div>
                    <div className="my-3">
                        <p className="text-2xl font-extrabold font-mono-num text-[#171717]">
                            ${pendingPayrolls.toLocaleString('es-AR')}
                        </p>
                        <p className="text-[11px] text-[#717784] mt-0.5">Liquidaciones pendientes de pago</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#717784] border-t border-[#E5E7EB] pt-2.5">
                        <span>Liquidaciones: {payrolls.length}</span>
                        <Link to="/employees" className="font-bold text-[#171717] hover:underline">
                            Ver personal →
                        </Link>
                    </div>
                </div>

                {/* KPI 4: Tareas Operativas */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#717784]">Tareas Pendientes</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F5F6F8] text-[#171717] border border-[#E5E7EB]">
                            {completedTasksCount}/{tasks.length} listas
                        </span>
                    </div>
                    <div className="my-3">
                        <p className="text-2xl font-extrabold font-mono-num text-[#171717]">
                            {pendingTasks.length}
                        </p>
                        <p className="text-[11px] text-[#717784] mt-0.5">
                            {pendingTasks.filter((t) => t.priority === 'high').length} de prioridad alta
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#717784] border-t border-[#E5E7EB] pt-2.5">
                        <span>Sincronizado</span>
                        <Link to="/tasks" className="font-bold text-[#171717] hover:underline">
                            Ir al gestor →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Banda de Rendimiento Financiero y Avance de Cobranzas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Composición de Flujo de Caja */}
                <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-[#171717]">
                                Indicadores de Rendimiento Financiero
                            </h2>
                            <p className="text-xs text-[#717784]">
                                Relación entre ingresos, egresos operativos de MYD y gastos domésticos
                            </p>
                        </div>
                        <Link
                            to="/finance"
                            className="text-xs font-semibold text-[#171717] px-3 py-1.5 rounded-lg bg-[#F5F6F8] hover:bg-neutral-200 border border-[#E5E7EB] transition"
                        >
                            Abrir Caja
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB]">
                            <span className="text-[11px] font-medium text-[#717784] block">
                                Ingresos Acumulados
                            </span>
                            <span className="text-base font-bold font-mono-num text-emerald-700 mt-1 block">
                                +${totalIncome.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB]">
                            <span className="text-[11px] font-medium text-[#717784] block">
                                Egresos Operativos MYD
                            </span>
                            <span className="text-base font-bold font-mono-num text-red-600 mt-1 block">
                                -${mydExpense.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="p-3.5 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB]">
                            <span className="text-[11px] font-medium text-[#717784] block">
                                Gastos Domésticos
                            </span>
                            <span className="text-base font-bold font-mono-num text-[#171717] mt-1 block">
                                -${householdExpense.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>

                    {/* Barra visual de avance de cobranza global de obras */}
                    <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#171717]">
                                Índice de Cobranza sobre Presupuestos Acordados
                            </span>
                            <span className="font-bold font-mono-num text-[#171717]">
                                {collectionRatePercent}% (${totalCollected.toLocaleString('es-AR')} / $
                                {totalAgreedBudget.toLocaleString('es-AR')})
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F5F6F8] rounded-full overflow-hidden border border-[#E5E7EB]">
                            <div
                                className="h-full bg-[#F5C518] transition-all duration-300"
                                style={{ width: `${collectionRatePercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Estado de Obras Activas */}
                <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-[#171717]">Obras Recientes</h2>
                            <p className="text-xs text-[#717784]">Seguimiento rápido de margen y cobro</p>
                        </div>
                        <Link
                            to="/works"
                            className="text-xs font-bold text-[#171717] hover:underline"
                        >
                            Ver todas →
                        </Link>
                    </div>

                    {works.length === 0 ? (
                        <div className="p-6 rounded-lg bg-[#F5F6F8] border border-dashed border-[#E5E7EB] text-center">
                            <p className="text-xs text-[#717784]">No hay obras registradas todavía.</p>
                            <Link
                                to="/works"
                                className="inline-block mt-2 text-xs font-bold text-[#171717] underline decoration-[#F5C518] decoration-2"
                            >
                                Registrar primera obra
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {works.slice(0, 3).map((w) => {
                                const metrics = calculateWorkMetrics({
                                    agreedBudget: w.agreedBudget,
                                    collectedAmount: w.collectedAmount,
                                    estimatedCosts: w.estimatedCosts,
                                });
                                return (
                                    <div
                                        key={w.id}
                                        className="p-3 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB] flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-[#171717] truncate">{w.name}</p>
                                            <p className="text-[11px] text-[#717784] truncate">
                                                {w.client || 'Cliente directo'} · Restan $
                                                {metrics.pendingCollection.toLocaleString('es-AR')}
                                            </p>
                                        </div>
                                        <span className="px-2 py-1 rounded text-[11px] font-mono-num font-bold bg-white border border-[#E5E7EB] text-[#171717] shrink-0">
                                            {metrics.profitMarginPercent}% margen
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Fila Inferior: Tareas Prioritarias y Movimientos Recientes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tareas Pendientes */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                        <div>
                            <h2 className="text-base font-bold text-[#171717]">Agenda Operativa Pendiente</h2>
                            <p className="text-xs text-[#717784]">Próximas acciones requeridas en obras</p>
                        </div>
                        <Link
                            to="/tasks"
                            className="text-xs font-semibold text-[#171717] hover:underline"
                        >
                            Gestionar ({pendingTasks.length})
                        </Link>
                    </div>

                    {pendingTasks.length === 0 ? (
                        <p className="text-xs text-[#717784] py-4 text-center">
                            No hay tareas pendientes. Todo el flujo operativo está al día.
                        </p>
                    ) : (
                        <div className="divide-y divide-[#E5E7EB]">
                            {pendingTasks.slice(0, 4).map((t) => (
                                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[#171717] truncate">{t.title}</p>
                                        <p className="text-[11px] text-[#717784] truncate">
                                            {t.dueDate ? `Vence: ${t.dueDate}` : 'Sin fecha límite'}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${t.priority === 'high'
                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                : t.priority === 'medium'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                                            }`}
                                    >
                                        {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Últimos Movimientos de Caja */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                        <div>
                            <h2 className="text-base font-bold text-[#171717]">Actividad Financiera Reciente</h2>
                            <p className="text-xs text-[#717784]">Últimos registros en el libro diario</p>
                        </div>
                        <Link
                            to="/finance"
                            className="text-xs font-semibold text-[#171717] hover:underline"
                        >
                            Ver libro diario
                        </Link>
                    </div>

                    {movements.length === 0 ? (
                        <p className="text-xs text-[#717784] py-4 text-center">
                            Aún no se registraron movimientos financieros.
                        </p>
                    ) : (
                        <div className="divide-y divide-[#E5E7EB]">
                            {movements.slice(0, 4).map((m) => (
                                <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[#171717] truncate">
                                            {m.description}
                                        </p>
                                        <p className="text-[11px] text-[#717784]">
                                            {m.date} · {m.category} ({m.account === 'myd' ? 'MYD' : 'Doméstico'})
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-bold font-mono-num shrink-0 ${m.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                                            }`}
                                    >
                                        {m.type === 'income' ? '+' : '-'}${m.amount.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;