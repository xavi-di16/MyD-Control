import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Work, WorkStatus } from '../../types';
import type { CreateWorkInput } from '../../services/firestore/worksService';
import { todayInArgentina } from '../../utils/attendance';
import { mapPosition, type MapPosition } from '../../utils/coordinates';
import { searchCities, type City } from './citySearch';
import { WorksMap } from './WorksMap';
import { workStatusOptions } from './workStatus';

type WorkFields = Omit<CreateWorkInput, 'userId'>;

const control = 'min-h-11 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm';
const field = 'grid gap-1 text-sm font-semibold';

export const WorkForm = ({ work, onSave, onCancel }: {
    work?: Work;
    onSave: (data: WorkFields) => Promise<void>;
    onCancel: () => void;
}) => {
    const [form, setForm] = useState({
        name: work?.name ?? '',
        client: work?.client ?? '',
        description: work?.description ?? '',
        address: work?.address ?? '',
        agreedBudget: String(work?.agreedBudget ?? ''),
        collectedAmount: String(work?.collectedAmount ?? ''),
        estimatedCosts: String(work?.estimatedCosts ?? ''),
        status: work?.status ?? 'planned',
        startDate: work?.startDate ?? todayInArgentina(),
        estimatedEndDate: work?.estimatedEndDate ?? '',
    });
    const [locality, setLocality] = useState(work?.locality ?? '');
    const [position, setPosition] = useState(() => mapPosition(work?.latitude, work?.longitude));
    const [viewportTarget, setViewportTarget] = useState(position);
    const [matches, setMatches] = useState<City[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const searchRequest = useRef<AbortController | null>(null);
    const busy = useRef(false);

    useEffect(() => () => searchRequest.current?.abort(), []);

    const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
        setForm((current) => ({ ...current, [field]: value }));

    const movePin = (point: MapPosition) => {
        setPosition(point);
        setSaveError('');
    };

    const selectCity = (city: City) => {
        setLocality(city.label);
        setViewportTarget([...city.position]);
        movePin(city.position);
    };

    const search = async () => {
        if (searching || locality.trim().length < 2) return;
        searchRequest.current?.abort();
        const controller = new AbortController();
        searchRequest.current = controller;
        setSearching(true);
        setSearchError('');
        setMatches([]);
        try {
            const cities = await searchCities(locality, controller.signal);
            if (controller.signal.aborted) return;
            setMatches(cities);
            if (cities.length) selectCity(cities[0]);
            else setSearchError('No encontramos esa localidad. Probá agregando la provincia o marcá el punto en el mapa.');
        } catch (error) {
            if (!controller.signal.aborted) {
                setSearchError(error instanceof Error && !(error instanceof TypeError)
                    ? error.message
                    : 'No se pudo buscar la localidad. Podés marcar la ubicación directamente en el mapa.');
            }
        } finally {
            if (!controller.signal.aborted) setSearching(false);
        }
    };

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy.current) return;
        if (!position) {
            setSaveError('Marcá la ubicación en el mapa antes de guardar.');
            return;
        }
        if (!form.name.trim()) {
            setSaveError('Ingresá un nombre para la obra.');
            return;
        }
        busy.current = true;
        setSaving(true);
        setSaveError('');
        try {
            await onSave({
                ...form,
                name: form.name.trim(),
                client: form.client.trim(),
                description: form.description.trim(),
                address: form.address.trim(),
                locality: locality.trim(),
                latitude: position[0],
                longitude: position[1],
                agreedBudget: Number(form.agreedBudget),
                collectedAmount: Number(form.collectedAmount),
                estimatedCosts: Number(form.estimatedCosts),
            });
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la obra.');
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return (
        <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
            <fieldset disabled={saving} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className={field}>Nombre de la obra
                        <input className={control} required value={form.name} onChange={(e) => update('name', e.target.value)} />
                    </label>
                    <label className={field}>Cliente
                        <input className={control} value={form.client} onChange={(e) => update('client', e.target.value)} />
                    </label>
                    <div className={field + ' sm:col-span-2'}>
                        <label htmlFor="work-description">Descripción</label>
                        <textarea id="work-description" className={control} rows={3} value={form.description}
                            onChange={(e) => update('description', e.target.value)} />
                    </div>
                </div>
                <section className="space-y-3 border-t border-[#E5E7EB] pt-4" aria-labelledby="work-location-heading">
                    <h2 id="work-location-heading" className="text-base font-bold">Ubicación</h2>
                    <div className="grid items-end gap-3 sm:grid-cols-2">
                        <div className="flex items-end gap-2">
                            <label className={field + ' min-w-0 flex-1'}>Ciudad o localidad
                                <input className={control} value={locality} placeholder="Ej. Villa Allende, Córdoba"
                                    onChange={(event) => {
                                        searchRequest.current?.abort();
                                        setSearching(false);
                                        setLocality(event.target.value);
                                        setMatches([]);
                                        setSearchError('');
                                    }} onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            void search();
                                        }
                                    }} />
                            </label>
                            <button type="button" disabled={searching || locality.trim().length < 2}
                                onClick={() => void search()} className="min-h-11 rounded-lg bg-[#171717] px-3 text-sm font-bold text-[#F5C518] disabled:opacity-50">
                                {searching ? 'Buscando…' : 'Buscar'}
                            </button>
                        </div>
                        <label className={field}>Dirección
                            <input className={control} value={form.address} onChange={(e) => update('address', e.target.value)}
                                placeholder="Calle y número, si los conocés" />
                        </label>
                    </div>
                    {searchError && <p role="status" className="text-sm text-amber-800">{searchError}</p>}
                    {matches.length > 1 && (
                        <ul aria-label="Localidades encontradas" className="flex flex-wrap gap-2">
                            {matches.map((city) => (
                                <li key={city.label}>
                                    <button type="button" aria-pressed={city.label === locality}
                                        onClick={() => selectCity(city)} className="min-h-10 rounded-lg border border-[#E5E7EB] px-3 text-sm aria-pressed:bg-[#FEF3C7]">
                                        {city.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-[#525866]">Arrastrá el pin o tocá el mapa para ubicar la obra con precisión.</p>
                    <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
                        <WorksMap label="Mapa para marcar la ubicación de la obra" className="h-80 sm:h-96"
                            picker={{ position, viewportTarget, status: form.status, onChange: movePin }} />
                    </div>
                    <p className="text-xs text-[#525866]" role="status">{position ? 'Ubicación marcada.' : 'Elegí una localidad o marcá un punto en el mapa.'}</p>
                </section>
                <div className="grid gap-4 border-t border-[#E5E7EB] pt-4 sm:grid-cols-3">
                    <div className={field}>
                        <label htmlFor="work-status">Estado</label>
                        <select id="work-status" className={control} value={form.status} onChange={(e) => update('status', e.target.value as WorkStatus)}>
                            {workStatusOptions.map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}
                        </select>
                    </div>
                    <label className={field}>Fecha de inicio
                        <input className={control} type="date" required value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
                    </label>
                    <label className={field}>Fecha estimada de finalización
                        <input className={control} type="date" min={form.startDate} value={form.estimatedEndDate} onChange={(e) => update('estimatedEndDate', e.target.value)} />
                    </label>
                    {([
                        ['agreedBudget', 'Presupuesto acordado ($)'],
                        ['collectedAmount', 'Cobrado ($)'],
                        ['estimatedCosts', 'Costos estimados ($)'],
                    ] as const).map(([key, label]) => (
                        <label className={field} key={key}>{label}
                            <input className={control} type="number" min="0" step="0.01" value={form[key]} placeholder="0"
                                onChange={(e) => update(key, e.target.value)} />
                        </label>
                    ))}
                </div>
            </fieldset>
            {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving || searching} className="min-h-11 rounded-lg bg-[#F5C518] px-4 text-sm font-bold disabled:opacity-50">
                    {saving ? 'Guardando…' : 'Guardar obra'}
                </button>
                <button type="button" disabled={saving} onClick={onCancel} className="min-h-11 rounded-lg border border-[#E5E7EB] px-4 text-sm font-semibold">
                    Cancelar
                </button>
            </div>
        </form>
    );
};
