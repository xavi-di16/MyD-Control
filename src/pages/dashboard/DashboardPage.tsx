// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Task, Work, Movement, PayrollRecord } from '../../types';
import { subscribeToUserTasks } from '../../services/firestore/tasksService';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { subscribeToMovements } from '../../services/firestore/financeService';
import { subscribeToPayrolls } from '../../services/firestore/employeesService';

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

    const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
    const activeWorksCount = works.filter((w) => w.status === 'active').length;

    const totalIncome = movements
        .filter((m) => m.type === 'income')
        .reduce((acc, m) => acc + m.amount, 0);
    const totalExpense = movements
        .filter((m) => m.type === 'expense')
        .reduce((acc, m) => acc + m.amount, 0);
    const availableCash = totalIncome - totalExpense;

    const pendingPayrolls = payrolls.reduce(
        (acc, p) => acc + Math.max(0, p.totalLiquidated - p.paidAmount),
        0
    );

    const pendingCollections = works.reduce(
        (acc, w) => acc + Math.max(0, w.agreedBudget - w.collectedAmount),
        0
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Panel General · MYD Control</h1>
                    <p className="text-sm text-slate-400">
                        Bienvenido, {user?.displayName || user?.email}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/tasks"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs transition"
                    >
                        + Gestionar Tareas
                    </Link>
                    <Link
                        to="/works"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs border border-slate-700 transition"
                    >
                        Mapa de Obras
                    </Link>
                    <Link
                        to="/reports"
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium rounded-lg text-xs border border-emerald-500/30 transition"
                    >
                        Cierre Semanal PDF
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Saldo Disponible en Caja</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">
                        ${availableCash.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Ingresos: ${totalIncome.toLocaleString('es-AR')} · Egresos: $
                        {totalExpense.toLocaleString('es-AR')}
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Obras en Ejecución</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                        {activeWorksCount} <span className="text-sm font-normal text-slate-400">/ {works.length} totales</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Por cobrar: ${pendingCollections.toLocaleString('es-AR')}
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Tareas Operativas Pendientes</p>
                    <p className="text-2xl font-bold text-white mt-1">{pendingTasksCount}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Jornales por saldar: ${pendingPayrolls.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;