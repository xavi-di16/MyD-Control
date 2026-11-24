// src/pages/works/WorksPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { BudgetItem, WeeklyJournal, Work, WorkStatus } from '../../types';
import { subscribeToJournals } from '../../services/firestore/attendanceService';
import { subscribeToBudgets } from '../../services/firestore/financeService';
import {
    subscribeToWorks,
    createWork,
    updateWork,
    deleteWork,
} from '../../services/firestore/worksService';
import { calculateWorkMetrics } from '../../utils/calculations';
import { journalLabor, workCosts } from '../../utils/attendance';
import { WorkLaborCosts } from './WorkLaborCosts';

const statusLabels: Record<WorkStatus, { label: string; color: string }> = {
    planned: { label: 'Planificada', color: 'bg-sky-50 text-sky-800 border-sky-200' },
    active: { label: 'En Ejecución', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    paused: { label: 'Pausada', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    completed: { label: 'Finalizada', color: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
};

export const WorksPage: React.FC = () => {
    const { user } = useAuth();
    const [works, setWorks] = useState<Work[]>([]);
    const [journals, setJournals] = useState<WeeklyJournal[]>();
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>();
    const [selectedWork, setSelectedWork] = useState<Work | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | WorkStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
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
                setSelectedWork((prev) => prev || (data.length > 0 ? data[0] : null));
            },
            (err) => setError(err.message)
        );
        const reportError = (err: Error) => setError(err.message);
        const unsubscribeLabor = subscribeToJournals(user.uid, setJournals, reportError);
        const unsubscribeCosts = subscribeToBudgets(user.uid, setBudgetItems, reportError);
        return () => {
            unsub();
            unsubscribeLabor();
            unsubscribeCosts();
        };
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

    const filteredWorks = works.filter((w) => {
        const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
        const matchesSearch =
            !searchQuery.trim() ||
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.address.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const activeWork =
        (selectedWork && works.find((w) => w.id === selectedWork.id)) ||
        filteredWorks[0] ||
        null;

    const activeMetrics = activeWork
        ? calculateWorkMetrics({
            agreedBudget: activeWork.agreedBudget,
            collectedAmount: activeWork.collectedAmount,
            estimatedCosts: activeWork.estimatedCosts,
        })
        : null;
    const labor = journalLabor(journals ?? []);
    const recordedCosts = workCosts(budgetItems ?? [], labor);

    return (
        <div className="space-y-6">
            {/* Cabecera del Módulo */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Mapa Interactivo y Gestión de Obras
                    </h1>
                    <p className="text-xs text-[#717784] mt-0.5">
                        Monitoreo geográfico de proyectos, control de cobranzas, costos y rentabilidad por obra
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por obra, cliente o dirección..."
                        className="px-3 py-1.5 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] w-full sm:w-56"
                    />
                    {(['all', 'active', 'planned', 'paused', 'completed'] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === st
                                    ? 'bg-[#171717] text-[#F5C518]'
                                    : 'bg-[#F5F6F8] text-[#717784] hover:text-[#171717] border border-[#E5E7EB]'
                                }`}
                        >
                            {st === 'all' ? 'Todas' : statusLabels[st].label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda (8 cols): Mapa + Ficha de Obra Seleccionada + Listado */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Contenedor del Mapa Interactivo */}
                    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
                        <div className="bg-[#171717] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#F5C518]" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                                    Cartografía Operativa MYD (OpenStreetMap)
                                </h2>
                            </div>
                            {activeWork && (
                                <span className="text-xs font-mono-num text-[#F5C518] bg-[#252525] px-2.5 py-1 rounded">
                                    {activeWork.name} · [{activeWork.latitude}, {activeWork.longitude}]
                                </span>
                            )}
                        </div>

                        {activeWork ? (
                            <div>
                                <div className="w-full h-80 bg-[#F5F6F8] border-b border-[#E5E7EB]">
                                    <iframe
                                        title={`Mapa de ${activeWork.name}`}
                                        width="100%"
                                        height="100%"
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeWork.longitude - 0.015
                                            }%2C${activeWork.latitude - 0.015}%2C${activeWork.longitude + 0.015}%2C${activeWork.latitude + 0.015
                                            }&layer=mapnik&marker=${activeWork.latitude}%2C${activeWork.longitude}`}
                                    />
                                </div>

                                {/* Ficha Técnica y Económica de la Obra Seleccionada */}
                                {activeMetrics && (
                                    <div className="p-5 bg-white space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F5C518] text-[#171717]">
                                                        FICHA DE OBRA SELECCIONADA
                                                    </span>
                                                    <span
                                                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusLabels[activeWork.status].color
                                                            }`}
                                                    >
                                                        {statusLabels[activeWork.status].label}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-[#171717] mt-1">
                                                    {activeWork.name}
                                                </h3>
                                                <p className="text-xs text-[#717784]">
                                                    Cliente: <strong className="text-[#171717]">{activeWork.client || 'No especificado'}</strong> · Dirección: {activeWork.address || 'Sin dirección'} · Inicio: {activeWork.startDate}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB]">
                                                <span className="text-[11px] text-[#717784] block">Presupuesto Acordado</span>
                                                <span className="text-sm font-bold font-mono-num text-[#171717]">
                                                    ${activeWork.agreedBudget.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB]">
                                                <span className="text-[11px] text-[#717784] block">Cobrado a la Fecha</span>
                                                <span className="text-sm font-bold font-mono-num text-emerald-700">
                                                    ${activeWork.collectedAmount.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-[#F5F6F8] border border-[#E5E7EB]">
                                                <span className="text-[11px] text-[#717784] block">Saldo por Cobrar</span>
                                                <span className="text-sm font-bold font-mono-num text-amber-700">
                                                    ${activeMetrics.pendingCollection.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-[#171717] text-white">
                                                <span className="text-[11px] text-neutral-400 block">Margen Estimado</span>
                                                <span className="text-sm font-bold font-mono-num text-[#F5C518]">
                                                    ${activeMetrics.estimatedProfit.toLocaleString('es-AR')} ({activeMetrics.profitMarginPercent}%)
                                                </span>
                                            </div>
                                        </div>
                                        {journals && budgetItems && <WorkLaborCosts key={activeWork.id}
                                            labor={labor.filter((day) => day.workId === activeWork.id)}
                                            agreedBudget={activeWork.agreedBudget}
                                            totalRecordedCost={recordedCosts.get(activeWork.id) ?? 0} />}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-80 bg-[#F5F6F8] flex flex-col items-center justify-center p-6 text-center">
                                <p className="text-sm font-semibold text-[#171717]">
                                    Sin obras seleccionadas en el mapa
                                </p>
                                <p className="text-xs text-[#717784] mt-1">
                                    Registra o selecciona una obra para visualizar su marcador e informe técnico.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Tarjetas de Obras Registradas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredWorks.map((w) => {
                            const metrics = calculateWorkMetrics({
                                agreedBudget: w.agreedBudget,
                                collectedAmount: w.collectedAmount,
                                estimatedCosts: w.estimatedCosts,
                            });
                            const badge = statusLabels[w.status];
                            const isSelected = activeWork?.id === w.id;

                            return (
                                <div
                                    key={w.id}
                                    onClick={() => setSelectedWork(w)}
                                    className={`p-5 rounded-xl bg-white border transition cursor-pointer shadow-2xs ${isSelected
                                            ? 'border-[#171717] ring-2 ring-[#F5C518]'
                                            : 'border-[#E5E7EB] hover:border-neutral-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-[#171717] truncate">{w.name}</h3>
                                            <p className="text-xs text-[#717784] truncate">
                                                Cliente: {w.client || 'Sin especificar'} · {w.address}
                                            </p>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs border-t border-[#E5E7EB] pt-3">
                                        <div>
                                            <span className="text-[#717784] text-[11px] block">Presupuesto</span>
                                            <span className="font-bold font-mono-num text-[#171717]">
                                                ${w.agreedBudget.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#717784] text-[11px] block">Falta Cobrar</span>
                                            <span className="font-bold font-mono-num text-amber-700">
                                                ${metrics.pendingCollection.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#717784] text-[11px] block">Rentabilidad</span>
                                            <span className="font-bold font-mono-num text-emerald-700">
                                                {metrics.profitMarginPercent}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB]">
                                        <select
                                            value={w.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                updateWork(w.id, { status: e.target.value as WorkStatus })
                                            }
                                            className="px-2.5 py-1 bg-[#F5F6F8] border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#171717]"
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
                                            className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Columna Derecha (4 cols): Formulario de Alta de Obra */}
                <form
                    onSubmit={handleCreateWork}
                    className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4 h-fit shadow-2xs"
                >
                    <div className="border-b border-[#E5E7EB] pb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784]">
                            ALTA DE PROYECTO
                        </span>
                        <h2 className="text-base font-bold text-[#171717]">Nueva Obra / Trabajo</h2>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">
                            Nombre de la Obra *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Remodelación Local Centro"
                            className="w-full px-3 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Cliente</label>
                        <input
                            type="text"
                            value={client}
                            onChange={(e) => setClient(e.target.value)}
                            placeholder="Nombre del cliente o empresa"
                            className="w-full px-3 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">
                            Dirección Física
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Av. Colón 500, Córdoba"
                            className="w-full px-3 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">Latitud</label>
                            <input
                                type="number"
                                step="any"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">Longitud</label>
                            <input
                                type="number"
                                step="any"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[11px] font-semibold text-[#171717] mb-1">
                                Presupuesto ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={agreedBudget}
                                onChange={(e) => setAgreedBudget(e.target.value)}
                                className="w-full px-2.5 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-[#171717] mb-1">
                                Cobrado ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={collectedAmount}
                                onChange={(e) => setCollectedAmount(e.target.value)}
                                className="w-full px-2.5 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-[#171717] mb-1">
                                Costo Est. ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={estimatedCosts}
                                onChange={(e) => setEstimatedCosts(e.target.value)}
                                className="w-full px-2.5 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono-num text-[#171717]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">Estado</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as WorkStatus)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                            >
                                <option value="planned">Planificada</option>
                                <option value="active">En Ejecución</option>
                                <option value="paused">Pausada</option>
                                <option value="completed">Finalizada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#171717] mb-1">
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">
                            Descripción / Notas técnicas
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Alcance de los trabajos, requerimientos del cliente..."
                            className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#171717]"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                    >
                        Guardar Obra y Ubicar en Mapa
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WorksPage;
