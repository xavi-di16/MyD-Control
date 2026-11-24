// src/pages/budgets/BudgetsPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { BudgetItem, WeeklyJournal, Work } from '../../types';
import { subscribeToJournals } from '../../services/firestore/attendanceService';
import {
    subscribeToBudgets,
    createBudgetItem,
    deleteBudgetItem,
} from '../../services/firestore/financeService';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { journalLabor, money } from '../../utils/attendance';

export const BudgetsPage: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<BudgetItem[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
    const [journals, setJournals] = useState<WeeklyJournal[]>([]);
    const [selectedWorkId, setSelectedWorkId] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);

    const [workId, setWorkId] = useState('');
    const [type, setType] = useState<'material' | 'labor' | 'other'>('material');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unitEstimatedCost, setUnitEstimatedCost] = useState('');
    const [unitActualCost, setUnitActualCost] = useState('');

    useEffect(() => {
        if (!user) return;
        const unsubBud = subscribeToBudgets(
            user.uid,
            (data) => setItems(data),
            (err) => setError(err.message)
        );
        const unsubWorks = subscribeToWorks(
            user.uid,
            (data) => {
                setWorks(data);
                setWorkId((prev) => prev || (data.length > 0 ? data[0].id : ''));
            },
            (err) => setError(err.message)
        );
        const unsubJournals = subscribeToJournals(user.uid, setJournals, (err) => setError(err.message));
        return () => {
            unsubBud();
            unsubWorks();
            unsubJournals();
        };
    }, [user]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !workId || !description.trim()) return;
        try {
            await createBudgetItem({
                userId: user.uid,
                workId,
                type,
                description,
                quantity: Number(quantity) || 1,
                unitEstimatedCost: Number(unitEstimatedCost) || 0,
                unitActualCost: Number(unitActualCost) || 0,
            });
            setDescription('');
            setQuantity('1');
            setUnitEstimatedCost('');
            setUnitActualCost('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al agregar ítem de presupuesto.');
        }
    };

    const filteredItems = items.filter(
        (it) => selectedWorkId === 'all' || it.workId === selectedWorkId
    );

    const totalEstimated = filteredItems.reduce(
        (acc, it) => acc + it.quantity * it.unitEstimatedCost,
        0
    );
    const laborCost = journalLabor(journals).reduce((sum, day) => (
        day.workId && (selectedWorkId === 'all' || day.workId === selectedWorkId) ? sum + day.amount : sum
    ), 0);
    const totalActual = laborCost + filteredItems.reduce(
        (acc, it) => acc + it.quantity * it.unitActualCost,
        0
    );
    const variance = totalEstimated - totalActual;

    const worksMap: Record<string, string> = {};
    works.forEach((w) => {
        worksMap[w.id] = w.name;
    });

    const rubroLabels: Record<'material' | 'labor' | 'other', string> = {
        material: 'Materiales',
        labor: 'Mano de Obra',
        other: 'Otros',
    };

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Presupuestos, Materiales y Rentabilidad
                    </h1>
                    <p className="text-xs text-[#717784] mt-0.5">
                        Comparativa técnica de costos estimados vs. gastos reales de materiales y mano de obra
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#717784]">Filtrar por obra:</span>
                    <select
                        value={selectedWorkId}
                        onChange={(e) => setSelectedWorkId(e.target.value)}
                        className="px-3.5 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#171717]"
                    >
                        <option value="all">Todas las obras</option>
                        {works.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                    {error}
                </div>
            )}

            {/* Indicadores Comparativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-semibold text-[#717784]">Costo Total Presupuestado</p>
                    <p className="text-2xl font-extrabold font-mono-num text-[#171717] mt-2">
                        ${totalEstimated.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-semibold text-[#717784]">Costo Real Ejecutado</p>
                    <p className="text-2xl font-extrabold font-mono-num text-[#171717] mt-2">
                        ${totalActual.toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-[#717784]">Incluye {money(laborCost)} de asistencia asignada.</p>
                </div>
                <div className="bg-[#171717] text-white rounded-xl p-5 shadow-2xs">
                    <p className="text-xs font-medium text-neutral-400">
                        Resultado de Ejecución (Ahorro / Sobrecosto)
                    </p>
                    <p
                        className={`text-2xl font-extrabold font-mono-num mt-2 ${variance >= 0 ? 'text-[#F5C518]' : 'text-red-400'
                            }`}
                    >
                        {variance >= 0 ? '+' : ''}${variance.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Formulario de Alta de Ítem */}
            <form
                onSubmit={handleSubmit}
                className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4"
            >
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                    <span className="w-2 h-4 rounded-xs bg-[#F5C518]" />
                    <h2 className="text-base font-bold text-[#171717]">Agregar Insumo o Mano de Obra</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Obra *</label>
                        <select
                            required
                            value={workId}
                            onChange={(e) => setWorkId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        >
                            <option value="">Seleccionar...</option>
                            {works.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Rubro</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as 'material' | 'labor' | 'other')}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        >
                            <option value="material">Materiales</option>
                            <option value="labor">Mano de Obra</option>
                            <option value="other">Otros</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#171717] mb-1">
                            Descripción del ítem *
                        </label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej. Placas Durlock / Rollos de cable 2.5mm"
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Cantidad</label>
                        <input
                            type="number"
                            min="1"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">
                            Unit. Estimado ($)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={unitEstimatedCost}
                            onChange={(e) => setUnitEstimatedCost(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">
                            Unit. Real ($)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={unitActualCost}
                            onChange={(e) => setUnitActualCost(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={works.length === 0}
                            className="w-full py-2 bg-[#F5C518] hover:bg-[#E0AD00] disabled:opacity-50 text-[#171717] font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                            Agregar Ítem
                        </button>
                    </div>
                </div>
                {type === 'labor' && <p className="text-xs text-[#717784]">
                    Usá este ítem para costos adicionales de mano de obra, como contratistas. Los jornales de la planilla de asistencia ya se suman al costo real.
                </p>}
            </form>

            {/* Tabla Comparativa de Ítems */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs">
                <h2 className="text-base font-bold text-[#171717] mb-4">
                    Desglose de Ítems Presupuestados vs. Ejecutados
                </h2>
                {filteredItems.length === 0 ? (
                    <p className="text-xs text-[#717784] py-6 text-center">
                        No hay ítems cargados para el filtro seleccionado.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] text-[#717784] bg-[#F5F6F8]">
                                    <th className="py-3 px-3 font-semibold">Obra</th>
                                    <th className="py-3 px-3 font-semibold">Rubro</th>
                                    <th className="py-3 px-3 font-semibold">Descripción</th>
                                    <th className="py-3 px-3 font-semibold">Cant.</th>
                                    <th className="py-3 px-3 font-semibold">Subtotal Est.</th>
                                    <th className="py-3 px-3 font-semibold">Subtotal Real</th>
                                    <th className="py-3 px-3 font-semibold">Desvío</th>
                                    <th className="py-3 px-3 font-semibold text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {filteredItems.map((it) => {
                                    const subEst = it.quantity * it.unitEstimatedCost;
                                    const subReal = it.quantity * it.unitActualCost;
                                    const diff = subEst - subReal;
                                    return (
                                        <tr key={it.id} className="hover:bg-[#F5F6F8]/60 transition">
                                            <td className="py-3 px-3 font-bold text-[#171717]">
                                                {worksMap[it.workId] || 'Obra'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="px-2 py-0.5 rounded bg-[#F5F6F8] border border-[#E5E7EB] text-[11px] font-semibold text-[#171717]">
                                                    {rubroLabels[it.type]}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-[#171717]">{it.description}</td>
                                            <td className="py-3 px-3 font-mono-num">{it.quantity}</td>
                                            <td className="py-3 px-3 font-mono-num text-[#717784]">
                                                ${subEst.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3 font-mono-num font-bold text-[#171717]">
                                                ${subReal.toLocaleString('es-AR')}
                                            </td>
                                            <td
                                                className={`py-3 px-3 font-mono-num font-bold ${diff >= 0 ? 'text-emerald-700' : 'text-red-600'
                                                    }`}
                                            >
                                                {diff >= 0 ? '+' : ''}${diff.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteBudgetItem(it.id)}
                                                    className="text-red-600 hover:text-red-800 font-semibold hover:underline cursor-pointer"
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

export default BudgetsPage;
