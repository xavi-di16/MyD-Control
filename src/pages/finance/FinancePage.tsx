// src/pages/finance/FinancePage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Movement, MovementType, AccountType, Work } from '../../types';
import {
    subscribeToMovements,
    createMovement,
    deleteMovement,
    updateMovement,
} from '../../services/firestore/financeService';
import { subscribeToWorks } from '../../services/firestore/worksService';

export const FinancePage: React.FC = () => {
    const { user } = useAuth();
    const [movements, setMovements] = useState<Movement[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
    const [accountFilter, setAccountFilter] = useState<'all' | AccountType>('all');
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const form = useRef<HTMLFormElement>(null);

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

    const startEditing = (movement: Movement) => {
        setEditing(movement.id);
        setType(movement.type);
        setAccount(movement.account);
        setCategory(movement.category);
        setDescription(movement.description);
        setAmount(String(movement.amount));
        setDate(movement.date);
        setWorkId(movement.workId ?? '');
        setError(null);
        form.current?.scrollIntoView({ block: 'start' });
        form.current?.querySelector('select')?.focus({ preventScroll: true });
    };

    const cancelEditing = () => {
        setEditing(null);
        setDescription('');
        setAmount('');
        setType('expense');
        setAccount('myd');
        setCategory('Materiales');
        setWorkId('');
        setDate(new Date().toISOString().slice(0, 10));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !description.trim() || !amount || saving) return;
        setSaving(true);
        setError(null);
        try {
            const input = { workId, type, account, category, description, amount: Number(amount), date };
            if (editing) {
                await updateMovement(editing, input);
                cancelEditing();
            } else {
                await createMovement({ userId: user.uid, ...input });
                setDescription('');
                setAmount('');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar movimiento.');
        } finally {
            setSaving(false);
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

    const worksMap: Record<string, string> = {};
    works.forEach((w) => {
        worksMap[w.id] = w.name;
    });

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Caja y Movimientos Financieros
                    </h1>
                    <p className="text-xs text-[#717784] mt-0.5">
                        Control contable separado de Caja MYD (Obras, Cobranzas, Deudas) y Gastos Domésticos
                    </p>
                </div>

                <div className="flex gap-2">
                    {(['all', 'myd', 'household'] as const).map((acc) => (
                        <button
                            key={acc}
                            type="button"
                            onClick={() => setAccountFilter(acc)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${accountFilter === acc
                                    ? 'bg-[#171717] text-[#F5C518]'
                                    : 'bg-[#F5F6F8] text-[#717784] hover:text-[#171717] border border-[#E5E7EB]'
                                }`}
                        >
                            {acc === 'all' ? 'Todas las Cajas' : acc === 'myd' ? 'Caja MYD' : 'Caja Doméstica'}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                    {error}
                </div>
            )}

            {/* Tarjetas de Resumen Financiero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-semibold text-[#717784]">Ingresos / Cobranzas</p>
                    <p className="text-2xl font-extrabold font-mono-num text-emerald-700 mt-2">
                        +${totalIncome.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-semibold text-[#717784]">Egresos Operativos MYD</p>
                    <p className="text-2xl font-extrabold font-mono-num text-red-600 mt-2">
                        -${totalMydExpenses.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-semibold text-[#717784]">Gastos Domésticos</p>
                    <p className="text-2xl font-extrabold font-mono-num text-[#171717] mt-2">
                        -${totalHouseholdExpenses.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-[#171717] text-white rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-medium text-neutral-400">Saldo Neto Disponible</p>
                    <p
                        className={`text-2xl font-extrabold font-mono-num mt-2 ${availableBalance >= 0 ? 'text-[#F5C518]' : 'text-red-400'
                            }`}
                    >
                        ${availableBalance.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Formulario de Registro de Movimiento */}
            <form
                ref={form}
                onSubmit={handleSubmit}
                className="scroll-mt-20 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4"
            >
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                    <span className="w-2 h-4 rounded-xs bg-[#F5C518]" />
                    <h2 className="text-base font-bold text-[#171717]">{editing ? 'Editar movimiento de caja' : 'Registrar Movimiento de Caja'}</h2>
                    {editing && <button type="button" disabled={saving} onClick={cancelEditing} className="ml-auto text-sm font-semibold hover:underline">Cancelar edición</button>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label htmlFor="finance-type" className="block text-xs font-semibold text-[#171717] mb-1">Tipo</label>
                        <select
                            id="finance-type"
                            value={type}
                            onChange={(e) => setType(e.target.value as MovementType)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#171717]"
                        >
                            <option value="income">Ingreso (+)</option>
                            <option value="expense">Egreso (-)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="finance-account" className="block text-xs font-semibold text-[#171717] mb-1">Cuenta</label>
                        <select
                            id="finance-account"
                            value={account}
                            onChange={(e) => setAccount(e.target.value as AccountType)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#171717]"
                        >
                            <option value="myd">Negocio (MYD)</option>
                            <option value="household">Doméstico</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="finance-category" className="block text-xs font-semibold text-[#171717] mb-1">Categoría</label>
                        <select
                            id="finance-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        >
                            <option value="Cobranza Obra">Cobranza Obra</option>
                            <option value="Materiales">Materiales</option>
                            <option value="Jornales / Adelantos">Jornales / Adelantos (manual)</option>
                            <option value="Herramientas / Inversión">Herramientas / Inversión</option>
                            <option value="Pago de Deuda">Pago de Deuda</option>
                            <option value="Hogar / Personal">Hogar / Personal</option>
                            {!['Cobranza Obra', 'Materiales', 'Jornales / Adelantos', 'Herramientas / Inversión', 'Pago de Deuda', 'Hogar / Personal'].includes(category) && <option>{category}</option>}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="finance-amount" className="block text-xs font-semibold text-[#171717] mb-1">Importe ($) *</label>
                        <input
                            id="finance-amount"
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Ej. 45000"
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                        />
                    </div>
                    <div>
                        <label htmlFor="finance-date" className="block text-xs font-semibold text-[#171717] mb-1">Fecha</label>
                        <input
                            id="finance-date"
                            required
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        />
                    </div>
                    <div>
                        <label htmlFor="finance-workId" className="block text-xs font-semibold text-[#171717] mb-1">
                            Obra (Opcional)
                        </label>
                        <select
                            id="finance-workId"
                            value={workId}
                            onChange={(e) => setWorkId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        >
                            <option value="">General</option>
                            {workId && !works.some((work) => work.id === workId) && <option value={workId}>Obra archivada</option>}
                            {works.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-3 lg:col-span-5">
                        <label htmlFor="finance-description" className="block text-xs font-semibold text-[#171717] mb-1">
                            Concepto / Descripción detallada *
                        </label>
                        <input
                            id="finance-description"
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej. Compra de bolsas de cemento y cables en corralón"
                            className="w-full px-3 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-2 bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Tabla del Libro Diario */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs">
                <h2 className="text-base font-bold text-[#171717] mb-4">Libro Diario de Movimientos</h2>
                {filteredMovements.length === 0 ? (
                    <p className="text-xs text-[#717784] py-6 text-center">
                        No hay movimientos registrados en este filtro.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] text-[#717784] bg-[#F5F6F8]">
                                    <th className="py-3 px-3 font-semibold">Fecha</th>
                                    <th className="py-3 px-3 font-semibold">Cuenta</th>
                                    <th className="py-3 px-3 font-semibold">Categoría</th>
                                    <th className="py-3 px-3 font-semibold">Detalle</th>
                                    <th className="py-3 px-3 font-semibold">Importe</th>
                                    <th className="py-3 px-3 font-semibold text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {filteredMovements.map((mov) => (
                                    <tr key={mov.id} className="hover:bg-[#F5F6F8]/60 transition">
                                        <td className="py-3 px-3 font-mono-num text-[#717784]">{mov.date}</td>
                                        <td className="py-3 px-3">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${mov.account === 'myd'
                                                        ? 'bg-[#171717] text-[#F5C518]'
                                                        : 'bg-neutral-100 text-neutral-700 border border-neutral-300'
                                                    }`}
                                            >
                                                {mov.account === 'myd' ? 'MYD' : 'Doméstico'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 font-medium text-[#171717]">{mov.category}</td>
                                        <td className="py-3 px-3 text-[#171717]">
                                            {mov.description}
                                            {mov.workId && worksMap[mov.workId] && (
                                                <span className="ml-2 text-[11px] text-[#717784]">
                                                    · Obra: {worksMap[mov.workId]}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`py-3 px-3 font-mono-num font-bold ${mov.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                                                }`}
                                        >
                                            {mov.type === 'income' ? '+' : '-'}${mov.amount.toLocaleString('es-AR')}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {mov.source === 'payroll' ? <Link to={'/employees?movement=' + encodeURIComponent(mov.id)} className="font-semibold hover:underline">Editar en Liquidación</Link> : <>
                                            <button type="button" disabled={saving} onClick={() => startEditing(mov)} className="mr-3 font-semibold hover:underline">Editar</button>
                                            <button
                                                type="button"
                                                onClick={() => deleteMovement(mov.id)}
                                                className="text-red-600 hover:text-red-800 font-semibold hover:underline cursor-pointer"
                                            >
                                                Eliminar
                                            </button></>}
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
