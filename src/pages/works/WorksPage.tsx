import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { BudgetItem, WeeklyJournal, Work, WorkStatus } from '../../types';
import { subscribeToJournals } from '../../services/firestore/attendanceService';
import { subscribeToBudgets } from '../../services/firestore/financeService';
import { createWork, deleteWork, subscribeToWorks, updateWork } from '../../services/firestore/worksService';
import { displayDate, journalLabor, money, workCosts } from '../../utils/attendance';
import { calculateWorkMetrics } from '../../utils/calculations';
import { mapPosition } from '../../utils/coordinates';
import { WorkForm } from './WorkForm';
import { WorkLaborCosts } from './WorkLaborCosts';
import { WorksMap, type WorkMarker } from './WorksMap';
import { workStatuses, workStatusOptions } from './workStatus';

const card = 'rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6';
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-bold';
const primary = button + ' bg-[#F5C518] text-[#171717] hover:bg-[#E0AD00] disabled:opacity-50';
const secondary = button + ' border border-[#E5E7EB] bg-white text-[#171717] hover:bg-[#F5F6F8]';
const pathForWork = (id: string) => '/works/' + encodeURIComponent(id);

const StatusBadge = ({ status }: { status: WorkStatus }) => {
    const label = workStatuses[status];
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
            style={{ color: label.color, backgroundColor: label.background }}>
            <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={label.symbol} />
            </svg>
            {label.label}
        </span>
    );
};

const markersFromWorks = (works: Work[]): WorkMarker[] => works.flatMap((work) => {
    const position = mapPosition(work.latitude, work.longitude);
    return position ? [{ id: work.id, name: work.name, status: work.status, position }] : [];
});

const useWorks = (userId?: string) => {
    const [works, setWorks] = useState<Work[]>();
    const [error, setError] = useState('');
    useEffect(() => {
        if (!userId) return;
        return subscribeToWorks(userId, setWorks, (err) => setError(err.message));
    }, [userId]);
    return { works, error };
};

const WorkError = ({ error }: { error: string }) =>
    error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>;

export const WorksPage = () => {
    const { user } = useAuth();
    return user && <WorksOverview key={user.uid} userId={user.uid} />;
};

const WorksOverview = ({ userId }: { userId: string }) => {
    const { works, error } = useWorks(userId);
    const [filter, setFilter] = useState<'all' | WorkStatus>('all');
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const openWork = useCallback((id: string) => navigate(pathForWork(id)), [navigate]);
    const markers = useMemo(() => markersFromWorks(works ?? []), [works]);
    const search = query.trim().toLocaleLowerCase('es');
    const filteredWorks = (works ?? []).filter((work) => (
        (filter === 'all' || work.status === filter)
        && [work.name, work.client, work.address, work.locality].some((value) => value?.toLocaleLowerCase('es').includes(search))
    ));

    return (
        <div className="space-y-6">
            <header className={card + ' flex flex-wrap items-center justify-between gap-3'}>
                <h1 className="text-2xl font-bold tracking-tight">Obras y mapa</h1>
                <Link to="/works/new" className={primary}>+ Nueva obra</Link>
            </header>
            <WorkError error={error} />
            <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white" aria-labelledby="works-map-heading">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#171717] px-4 py-3 text-white sm:px-6">
                    <h2 id="works-map-heading" className="text-base font-bold">Mapa de todas las obras</h2>
                    {works && <p className="text-sm text-[#F5C518]">{markers.length} de {works.length} ubicadas</p>}
                </div>
                <WorksMap label="Mapa general de obras" className="h-[56vh] min-h-80 max-h-[42rem]" markers={markers} onOpenWork={openWork} />
                <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-6" aria-label="Estados de las obras">
                    {workStatusOptions.map(([status]) => <StatusBadge key={status} status={status} />)}
                </div>
            </section>
            <section className="space-y-3" aria-labelledby="works-list-heading">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 id="works-list-heading" className="text-xl font-bold">Listado de obras</h2>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        <input type="search" aria-label="Buscar en el listado" placeholder="Obra, cliente o ubicación" value={query}
                            onChange={(e) => setQuery(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm" />
                        <select aria-label="Filtrar listado por estado" value={filter}
                            onChange={(e) => setFilter(e.target.value as typeof filter)} className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm">
                            <option value="all">Todos los estados</option>
                            {workStatusOptions.map(([status, { label }]) => <option key={status} value={status}>{label}</option>)}
                        </select>
                    </div>
                </div>
                {!works && !error && <p role="status" className="text-sm text-[#525866]">Cargando obras…</p>}
                {!!works && !filteredWorks.length && (
                    <p className={card + ' text-sm text-[#525866]'}>{works.length ? 'Ninguna obra coincide con la búsqueda.' : 'Todavía no hay obras cargadas.'}</p>
                )}
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredWorks.map((work) => {
                        const metrics = calculateWorkMetrics(work);
                        return (
                            <li key={work.id} className="min-w-0">
                                <Link to={pathForWork(work.id)} className={card + ' block h-full transition hover:border-[#C49607] focus-visible:outline-2 focus-visible:outline-[#A47D00]'}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <h3 className="min-w-0 break-words text-base font-bold">{work.name}</h3>
                                        <StatusBadge status={work.status} />
                                    </div>
                                    {(work.address || work.locality) && <p className="mt-2 break-words text-sm text-[#525866]">{[work.address, work.locality].filter(Boolean).join(' · ')}</p>}
                                    {work.client && <p className="mt-1 break-words text-sm text-[#525866]">{work.client}</p>}
                                    <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-[#E5E7EB] pt-3 text-sm">
                                        <div><dt className="text-[#525866]">Presupuesto</dt><dd className="font-bold">{money(work.agreedBudget)}</dd></div>
                                        <div><dt className="text-[#525866]">Por cobrar</dt><dd className="font-bold">{money(metrics.pendingCollection)}</dd></div>
                                    </dl>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
};

export const NewWorkPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    if (!user) return null;
    return (
        <div className="space-y-4">
            <Link to="/works" className="inline-flex min-h-11 items-center text-sm font-semibold hover:underline">← Volver a todas las obras</Link>
            <h1 className="text-2xl font-bold tracking-tight">Nueva obra</h1>
            <WorkForm onCancel={() => navigate('/works')} onSave={async (data) => {
                const id = await createWork({ userId: user.uid, ...data });
                navigate(pathForWork(id), { replace: true });
            }} />
        </div>
    );
};

export const WorkDetailPage = () => {
    const { user } = useAuth();
    const { workId } = useParams();
    return user && workId && <WorkDetail key={user.uid + '/' + workId} userId={user.uid} workId={workId} />;
};

const WorkDetail = ({ userId, workId }: { userId: string; workId: string }) => {
    const navigate = useNavigate();
    const { works, error } = useWorks(userId);
    const work = works?.find((item) => item.id === workId);
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [costError, setCostError] = useState('');
    const [journals, setJournals] = useState<WeeklyJournal[]>();
    const [items, setItems] = useState<BudgetItem[]>();
    const markers = useMemo(() => markersFromWorks(work ? [work] : []), [work]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const reportError = (err: Error) => setCostError(err.message);
        const unsubscribeJournals = subscribeToJournals(userId, setJournals, reportError);
        const unsubscribeBudgets = subscribeToBudgets(userId, setItems, reportError);
        return () => {
            unsubscribeJournals();
            unsubscribeBudgets();
        };
    }, [userId]);

    const remove = async () => {
        if (busy || !work || !window.confirm('¿Eliminar esta obra?')) return;
        setBusy(true);
        setActionError('');
        try {
            await deleteWork(work.id);
            navigate('/works', { replace: true });
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'No se pudo eliminar la obra.');
        } finally {
            setBusy(false);
        }
    };

    const metrics = work && calculateWorkMetrics(work);
    const labor = journalLabor(journals ?? []).filter((day) => day.workId === workId);
    const costs = workCosts((items ?? []).filter((item) => item.workId === workId), labor);

    return (
        <div className="space-y-4">
            <Link to="/works" className="inline-flex min-h-11 items-center text-sm font-semibold hover:underline">← Volver a todas las obras</Link>
            <WorkError error={error || actionError} />
            {!works && !error && <p role="status" className="text-sm text-[#525866]">Cargando obra…</p>}
            {works && !work && <p className={card}>No encontramos esa obra.</p>}
            {work && metrics && (
                <>
                    <header className={card + ' flex flex-wrap items-start justify-between gap-3'}>
                        <div className="min-w-0 space-y-2">
                            <h1 className="break-words text-2xl font-bold tracking-tight">{work.name}</h1>
                            <StatusBadge status={work.status} />
                        </div>
                        {!editing && <button type="button" onClick={() => setEditing(true)} className={primary}>Editar obra</button>}
                    </header>
                    {editing ? <WorkForm work={work} onCancel={() => setEditing(false)} onSave={async (data) => {
                        await updateWork(work.id, data);
                        setEditing(false);
                    }} /> : (
                        <>
                            <section className={card + ' space-y-4'} aria-label="Datos de la obra">
                                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                    {([
                                        ['Cliente', work.client || '—'],
                                        ['Ubicación', [work.address, work.locality].filter(Boolean).join(' · ') || '—'],
                                        ['Fecha de inicio', displayDate(work.startDate)],
                                        ['Finalización estimada', work.estimatedEndDate ? displayDate(work.estimatedEndDate) : '—'],
                                        ['Presupuesto acordado', money(work.agreedBudget)],
                                        ['Importe cobrado', money(work.collectedAmount)],
                                        ['Saldo por cobrar', money(metrics.pendingCollection)],
                                        ['Costos estimados', money(work.estimatedCosts)],
                                        ['Margen estimado', money(metrics.estimatedProfit) + ' (' + metrics.profitMarginPercent + '%)'],
                                    ] as const).map(([label, value]) => (
                                        <div key={label}><dt className="text-[#525866]">{label}</dt><dd className="break-words font-bold">{value}</dd></div>
                                    ))}
                                </dl>
                                {work.description && <p className="whitespace-pre-wrap break-words border-t border-[#E5E7EB] pt-3 text-sm">{work.description}</p>}
                            </section>
                            {markers.length ? (
                                <section className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                                    <WorksMap label={'Mapa de ' + work.name} className="h-80 sm:h-96" markers={markers} />
                                </section>
                            ) : <p className={card + ' text-sm text-[#525866]'}>La obra todavía no tiene una ubicación marcada.</p>}
                            <WorkError error={costError} />
                            {!!journals && !!items && <div className={card}>
                                <WorkLaborCosts labor={labor} agreedBudget={work.agreedBudget} totalRecordedCost={costs.get(workId) ?? 0} />
                            </div>}
                            <button type="button" disabled={busy} onClick={() => void remove()} className={secondary + ' text-red-700'}>
                                Eliminar obra
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
