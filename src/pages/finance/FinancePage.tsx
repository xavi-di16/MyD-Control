// src/pages/finance/FinancePage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Movement, MovementType, AccountType, Work } from '../../types';
import {
    subscribeToMovements,
    createMovement,
    deleteMovement,
} from '../../services/firestore/financeService';
import { subscribeToWorks } from '../../services/firestore/worksService';

export const FinancePage: React.FC = () => {
    const { user } = useAuth();
    const [movements, setMovements] = useState<Movement[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
    const [accountFilter, setAccountFilter] = useState<'all' | AccountType>('all');
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<MovementType>('expense');
    const [account, setAccount] = useState<AccountType>('myd');
    const [category, setCategory] = useState('Materiales');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [workId, setWorkId] = useState('');

    useEffect(() => {
        if (!user) return;
        const unsubMov = subscribeToMovements(
            user.uid,
            (data) => setMovements(data),
            (err) => setError(err.message)
        );
        const unsubWorks = subscribeToWorks(
            user.uid,
            (data) => setWorks(data),
            (err) => setError(err.message)
        );
        return () => {
            unsubMov();
            unsubWorks();
        };
    }, [user]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !description.trim() || !amount) return;
        try {
            await createMovement({
                userId: user.uid,
                workId: workId || undefined,
                type,
                account,
                category,
                description,
                amount: Number(amount),
                date,
            });
            setDescription('');
            setAmount('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar movimiento.');
        }
    };

    const filteredMovements = movements.filter(
        (m) => accountFilter === 'all' || m.account === accountFilter
    );

    const totalIncome = filteredMovements
        .filter((m) => m.type === 'income')
        .reduce((acc, m) => acc + m.amount, 0);

    const totalMydExpenses = filteredMovements
        .filter((m) => m.type === 'expense' && m.account === 'myd')
        .reduce((acc, m) => acc + m.amount, 0);

    const totalHouseholdExpenses = filteredMovements
        .filter((m) => m.type === 'expense' && m.account === 'household')
        .reduce((acc, m) => acc + m.amount, 0);

    const availableBalance = totalIncome - totalMydExpenses - totalHouseholdExpenses;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Caja y Movimientos Financieros</h1>
                    <p className="text-sm text-slate-400">
                        Control separado de Caja MYD (Obras, Cobranzas, Deudas) y Gastos Domésticos
                    </p>
                </div>

                <div className="flex gap-2">
                    {(['all', 'myd', 'household'] as const).map((acc) => (
                        <button
                            key={acc}
                            type="button"
                            onClick={() => setAccountFilter(acc)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${accountFilter === acc
                                    ? 'bg-amber-500 text-slate-950 font-semibold'
                                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                                }`}
                        >
                            {acc === 'all' ? 'Todas las Cajas' : acc === 'myd' ? 'Caja MYD' : 'Caja Doméstica'}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Ingresos / Cobranzas</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">
                        +${totalIncome.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Egresos Operativos MYD</p>
                    <p className="text-xl font-bold text-red-400 mt-1">
                        -${totalMydExpenses.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Gastos Domésticos</p>
                    <p className="text-xl font-bold text-sky-400 mt-1">
                        -${totalHouseholdExpenses.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Saldo Neto Disponible</p>
                    <p
                        className={`text-xl font-bold mt-1 ${availableBalance >= 0 ? 'text-amber-400' : 'text-red-400'
                            }`}
                    >
                        ${availableBalance.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
                <h2 className="text-base font-semibold text-white">Registrar Movimiento de Caja</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Tipo</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as MovementType)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        >
                            <option value="income">Ingreso (+)</option>
                            <option value="expense">Egreso (-)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Cuenta</label>
                        <select
                            value={account}
                            onChange={(e) => setAccount(e.target.value as AccountType)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        >
                            <option value="myd">Negocio (MYD)</option>
                            <option value="household">Doméstico</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        >
                            <option value="Cobranza Obra">Cobranza Obra</option>
                            <option value="Materiales">Materiales</option>
                            <option value="Jornales / Adelantos">Jornales / Adelantos</option>
                            <option value="Herramientas / Inversión">Herramientas / Inversión</option>
                            <option value="Pago de Deuda">Pago de Deuda</option>
                            <option value="Hogar / Personal">Hogar / Personal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Importe ($) *</label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Ej. 45000"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Fecha</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Obra (Opcional)</label>
                        <select
                            value={workId}
                            onChange={(e) => setWorkId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        >
                            <option value="">General</option>
                            {works.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-3 lg:col-span-5">
                        <label className="block text-xs text-slate-300 mb-1">Concepto / Detalle *</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej. Compra de bolsas de cemento y cables en corralón"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-4">Libro Diario de Movimientos</h2>
                {filteredMovements.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay movimientos registrados en este filtro.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 pr-3">Fecha</th>
                                    <th className="py-2 px-3">Cuenta</th>
                                    <th className="py-2 px-3">Categoría</th>
                                    <th className="py-2 px-3">Detalle</th>
                                    <th className="py-2 px-3">Importe</th>
                                    <th className="py-2 pl-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredMovements.map((mov) => (
                                    <tr key={mov.id}>
                                        <td className="py-2.5 pr-3 text-slate-400">{mov.date}</td>
                                        <td className="py-2.5 px-3">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${mov.account === 'myd'
                                                        ? 'bg-amber-500/15 text-amber-300'
                                                        : 'bg-sky-500/15 text-sky-300'
                                                    }`}
                                            >
                                                {mov.account === 'myd' ? 'MYD' : 'Doméstico'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-300">{mov.category}</td>
                                        <td className="py-2.5 px-3 text-white">{mov.description}</td>
                                        <td
                                            className={`py-2.5 px-3 font-bold ${mov.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                                                }`}
                                        >
                                            {mov.type === 'income' ? '+' : '-'}${mov.amount.toLocaleString('es-AR')}
                                        </td>
                                        <td className="py-2.5 pl-3">
                                            <button
                                                type="button"
                                                onClick={() => deleteMovement(mov.id)}
                                                className="text-red-400 hover:underline cursor-pointer"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancePage;