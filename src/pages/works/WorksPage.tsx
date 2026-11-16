// src/pages/works/WorksPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Work, WorkStatus } from '../../types';
import {
    subscribeToWorks,
    createWork,
    updateWork,
    deleteWork,
} from '../../services/firestore/worksService';
import { calculateWorkMetrics } from '../../utils/calculations';

const statusLabels: Record<WorkStatus, { label: string; color: string }> = {
    planned: { label: 'Planificada', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
    active: { label: 'En Ejecución', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    paused: { label: 'Pausada', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    completed: { label: 'Finalizada', color: 'bg-slate-700 text-slate-300 border-slate-600' },
};

export const WorksPage: React.FC = () => {
    const { user } = useAuth();
    const [works, setWorks] = useState<Work[]>([]);
    const [selectedWork, setSelectedWork] = useState<Work | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | WorkStatus>('all');
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [client, setClient] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState('-31.4201');
    const [longitude, setLongitude] = useState('-64.1888');
    const [agreedBudget, setAgreedBudget] = useState('850000');
    const [collectedAmount, setCollectedAmount] = useState('350000');
    const [estimatedCosts, setEstimatedCosts] = useState('520000');
    const [status, setStatus] = useState<WorkStatus>('active');
    const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToWorks(
            user.uid,
            (data) => {
                setWorks(data);
                if (data.length > 0 && !selectedWork) {
                    setSelectedWork(data[0]);
                }
            },
            (err) => setError(err.message)
        );
        return () => unsub();
    }, [user]);

    const handleCreateWork = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;
        try {
            await createWork({
                userId: user.uid,
                name,
                client,
                description,
                address,
                latitude: Number(latitude) || -31.4201,
                longitude: Number(longitude) || -64.1888,
                agreedBudget: Number(agreedBudget) || 0,
                collectedAmount: Number(collectedAmount) || 0,
                estimatedCosts: Number(estimatedCosts) || 0,
                status,
                startDate,
            });
            setName('');
            setClient('');
            setDescription('');
            setAddress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar la obra.');
        }
    };

    const filteredWorks = works.filter(
        (w) => statusFilter === 'all' || w.status === statusFilter
    );

    const activeWork = selectedWork || filteredWorks[0] || null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mapa Interactivo y Gestión de Obras</h1>
                    <p className="text-sm text-slate-400">
                        Visualización geográfica, control de cobranzas, costos y ficha técnica por obra
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(['all', 'active', 'planned', 'paused', 'completed'] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${statusFilter === st
                                    ? 'bg-amber-500 text-slate-950 font-semibold'
                                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                                }`}
                        >
                            {st === 'all' ? 'Todas' : statusLabels[st].label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white">
                            Mapa Geográfico de Obras (OpenStreetMap)
                        </h2>
                        {activeWork && (
                            <span className="text-xs text-amber-400 font-medium">
                                Foco actual: {activeWork.name} ({activeWork.latitude}, {activeWork.longitude})
                            </span>
                        )}
                    </div>

                    {activeWork ? (
                        <div className="w-full h-80 rounded-lg overflow-hidden border border-slate-800">
                            <iframe
                                title={`Mapa de ${activeWork.name}`}
                                width="100%"
                                height="100%"
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeWork.longitude - 0.015
                                    }%2C${activeWork.latitude - 0.015}%2C${activeWork.longitude + 0.015}%2C${activeWork.latitude + 0.015
                                    }&layer=mapnik&marker=${activeWork.latitude}%2C${activeWork.longitude}`}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-80 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-400">
                            Registra o selecciona una obra para visualizar su marcador en el mapa interactivo.
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {filteredWorks.map((w) => {
                            const metrics = calculateWorkMetrics({
                                agreedBudget: w.agreedBudget,
                                collectedAmount: w.collectedAmount,
                                estimatedCosts: w.estimatedCosts,
                            });
                            const badge = statusLabels[w.status];

                            return (
                                <div
                                    key={w.id}
                                    onClick={() => setSelectedWork(w)}
                                    className={`p-4 rounded-xl border transition cursor-pointer ${activeWork?.id === w.id
                                            ? 'bg-slate-950 border-amber-500'
                                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{w.name}</h3>
                                            <p className="text-xs text-slate-400">
                                                Cliente: {w.client || 'Sin especificar'} · {w.address}
                                            </p>
                                        </div>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs border-t border-slate-800 pt-2">
                                        <div>
                                            <span className="text-slate-400 block">Presupuesto</span>
                                            <span className="font-semibold text-white">
                                                ${w.agreedBudget.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block">Falta Cobrar</span>
                                            <span className="font-semibold text-amber-400">
                                                ${metrics.pendingCollection.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block">Rentabilidad</span>
                                            <span className="font-semibold text-emerald-400">
                                                {metrics.profitMarginPercent}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <select
                                            value={w.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                updateWork(w.id, { status: e.target.value as WorkStatus })
                                            }
                                            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white"
                                        >
                                            <option value="planned">Planificada</option>
                                            <option value="active">En Ejecución</option>
                                            <option value="paused">Pausada</option>
                                            <option value="completed">Finalizada</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteWork(w.id);
                                            }}
                                            className="text-xs text-red-400 hover:underline cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <form
                    onSubmit={handleCreateWork}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 h-fit"
                >
                    <h2 className="text-base font-semibold text-white">Nueva Obra / Trabajo</h2>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Nombre de la Obra *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Remodelación Local Centro"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Cliente</label>
                        <input
                            type="text"
                            value={client}
                            onChange={(e) => setClient(e.target.value)}
                            placeholder="Nombre del cliente"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Dirección</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Av. Colón 500, Córdoba"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Latitud</label>
                            <input
                                type="number"
                                step="any"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Longitud</label>
                            <input
                                type="number"
                                step="any"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Presupuesto ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={agreedBudget}
                                onChange={(e) => setAgreedBudget(e.target.value)}
                                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Cobrado ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={collectedAmount}
                                onChange={(e) => setCollectedAmount(e.target.value)}
                                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Costo Est. ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={estimatedCosts}
                                onChange={(e) => setEstimatedCosts(e.target.value)}
                                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Estado</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as WorkStatus)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            >
                                <option value="planned">Planificada</option>
                                <option value="active">En Ejecución</option>
                                <option value="paused">Pausada</option>
                                <option value="completed">Finalizada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Fecha Inicio</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Descripción / Notas</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs transition cursor-pointer"
                    >
                        Guardar Obra y Ubicar en Mapa
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WorksPage;