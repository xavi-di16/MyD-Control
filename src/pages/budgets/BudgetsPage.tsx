// src/pages/budgets/BudgetsPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { BudgetItem, Work } from '../../types';
import {
    subscribeToBudgets,
    createBudgetItem,
    deleteBudgetItem,
} from '../../services/firestore/financeService';
import { subscribeToWorks } from '../../services/firestore/worksService';

export const BudgetsPage: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<BudgetItem[]>([]);
    const [works, setWorks] = useState<Work[]>([]);
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
                if (data.length > 0 && !workId) {
                    setWorkId(data[0].id);
                }
            },
            (err) => setError(err.message)
        );
        return () => {
            unsubBud();
            unsubWorks();
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
    const totalActual = filteredItems.reduce(
        (acc, it) => acc + it.quantity * it.unitActualCost,
        0
    );
    const variance = totalEstimated - totalActual;

    const worksMap: Record<string, string> = {};
    works.forEach((w) => {
        worksMap[w.id] = w.name;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Presupuestos, Materiales y Rentabilidad</h1>
                    <p className="text-sm text-slate-400">
                        Comparativa de costos estimados vs. gastos reales de materiales y mano de obra
                    </p>
                </div>

                <select
                    value={selectedWorkId}
                    onChange={(e) => setSelectedWorkId(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                    <option value="all">Todas las obras</option>
                    {works.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Costo Total Presupuestado</p>
                    <p className="text-xl font-bold text-white mt-1">
                        ${totalEstimated.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Costo Real Ejecutado</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">
                        ${totalActual.toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-400">Desvío (Ahorro / Sobrecosto)</p>
                    <p
                        className={`text-xl font-bold mt-1 ${variance >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                    >
                        {variance >= 0 ? '+' : ''}${variance.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
                <h2 className="text-base font-semibold text-white">Agregar Insumo o Mano de Obra</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Obra *</label>
                        <select
                            required
                            value={workId}
                            onChange={(e) => setWorkId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
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
                        <label className="block text-xs text-slate-300 mb-1">Rubro</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as 'material' | 'labor' | 'other')}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        >
                            <option value="material">Materiales</option>
                            <option value="labor">Mano de Obra</option>
                            <option value="other">Otros</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-300 mb-1">Descripción del ítem *</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej. Placas Durlock / Cables 2.5mm"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Cantidad</label>
                        <input
                            type="number"
                            min="1"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Unit. Estimado ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={unitEstimatedCost}
                            onChange={(e) => setUnitEstimatedCost(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Unit. Real ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={unitActualCost}
                            onChange={(e) => setUnitActualCost(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={works.length === 0}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                        >
                            Agregar Ítem
                        </button>
                    </div>
                </div>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-base font-semibold text-white mb-4">Desglose de Ítems Presupuestados</h2>
                {filteredItems.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay ítems cargados para el filtro seleccionado.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 pr-3">Obra</th>
                                    <th className="py-2 px-3">Rubro</th>
                                    <th className="py-2 px-3">Descripción</th>
                                    <th className="py-2 px-3">Cant.</th>
                                    <th className="py-2 px-3">Subtotal Est.</th>
                                    <th className="py-2 px-3">Subtotal Real</th>
                                    <th className="py-2 pl-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredItems.map((it) => {
                                    const subEst = it.quantity * it.unitEstimatedCost;
                                    const subReal = it.quantity * it.unitActualCost;
                                    return (
                                        <tr key={it.id}>
                                            <td className="py-2.5 pr-3 text-amber-400 font-medium">
                                                {worksMap[it.workId] || 'Obra'}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-400 uppercase">{it.type}</td>
                                            <td className="py-2.5 px-3 text-white">{it.description}</td>
                                            <td className="py-2.5 px-3">{it.quantity}</td>
                                            <td className="py-2.5 px-3">${subEst.toLocaleString('es-AR')}</td>
                                            <td className="py-2.5 px-3 font-semibold text-emerald-400">
                                                ${subReal.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-2.5 pl-3">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteBudgetItem(it.id)}
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

export default BudgetsPage;