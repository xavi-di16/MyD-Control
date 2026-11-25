import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { subscribeToBudgets } from '../../services/firestore/financeService';
import type { BudgetItem, Work } from '../../types';
import { todayInArgentina } from '../../utils/attendance';
import { renderLegacyDocument, type PrintDraft, type PrintSection } from './legacyPrintDocument';

const input = 'w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-base';
const label = 'grid gap-1 text-sm font-semibold';
const button = 'min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-bold';

export const DocumentComposer = ({ kind }: { kind: 'budget' | 'report' }) => {
    const { user } = useAuth();
    const { state } = useLocation();
    const budget = kind === 'budget';
    const [works, setWorks] = useState<Work[]>([]);
    const [items, setItems] = useState<BudgetItem[]>([]);
    const [workId, setWorkId] = useState<string>(state?.workId ?? '');
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const frame = useRef<HTMLIFrameElement>(null);
    const [draft, setDraft] = useState<PrintDraft>(() => {
        const date = todayInArgentina();
        return {
            number: '#001-' + date.slice(0, 4), date, client: '', detail: '',
            description: state?.reportText ?? '', sections: [], notes: '',
            price: '$ 0.00', deadline: 'A coordinar según disponibilidad', payment: '',
        };
    });

    useEffect(() => {
        if (!user) return;
        const onError = (err: Error) => setError(err.message);
        const undoWorks = subscribeToWorks(user.uid, setWorks, onError);
        const undoItems = budget ? subscribeToBudgets(user.uid, setItems, onError) : undefined;
        return () => { undoWorks(); undoItems?.(); };
    }, [user, budget]);

    useEffect(() => {
        if (ready && frame.current?.contentDocument) renderLegacyDocument(frame.current.contentDocument, draft, kind);
    }, [draft, kind, ready]);

    const loadWork = () => {
        const work = works.find((item) => item.id === workId);
        if (!work) return;
        setDraft((previous) => ({
            ...previous,
            client: work.client,
            detail: [work.address, work.locality].filter(Boolean).join(' · ') || work.name,
            ...(budget && {
                description: work.description || work.name,
                price: '$ ' + work.agreedBudget.toLocaleString('es-AR'),
                ...(work.estimatedEndDate && { deadline: work.estimatedEndDate.split('-').reverse().join('/') }),
            }),
        }));
    };

    const loadItems = () => {
        const selected = items.filter((item) => item.workId === workId);
        const groups = new Map<string, string[]>();
        const names = { material: 'Materiales', labor: 'Mano de obra', other: 'Otros trabajos' };
        for (const item of selected) {
            const group = names[item.type];
            const lines = groups.get(group) ?? [];
            lines.push(item.description + (item.quantity === 1 ? '' : ' (×' + item.quantity.toLocaleString('es-AR') + ')'));
            groups.set(group, lines);
        }
        setDraft((previous) => ({
            ...previous,
            sections: [...previous.sections, ...[...groups].map(([title, lines]) => ({ title, content: lines.join('\n') }))],
        }));
    };

    const updateSection = (index: number, key: keyof PrintSection, value: string) =>
        setDraft((previous) => ({
            ...previous, sections: previous.sections.map((section, i) => i === index ? { ...section, [key]: value } : section),
        }));

    const template = budget ? 'presupuesto' : 'informe';
    return (
        <div className="space-y-4">
            <Link to={budget ? '/budgets' : '/reports'} className="text-sm font-semibold hover:underline">
                ← Volver a {budget ? 'Presupuestos' : 'Informes y cierres'}
            </Link>
            <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">{budget ? 'Presupuesto para el cliente' : 'Informe técnico de cierre'}</h1>
                    <button type="button" disabled={!ready} className="min-h-11 rounded-lg bg-[#F5C518] px-4 text-sm font-bold disabled:opacity-50"
                        onClick={() => {
                            const preview = frame.current;
                            if (!preview?.contentDocument) return;
                            renderLegacyDocument(preview.contentDocument, draft, kind);
                            preview.contentWindow?.print();
                        }}>
                        Imprimir / Guardar PDF
                    </button>
                </header>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div className="flex flex-wrap items-end gap-2 border-b border-[#E5E7EB] pb-4">
                    <label className={label + ' min-w-0 flex-1'}><span>Cargar datos de una obra</span>
                        <select className={input} value={workId} onChange={(event) => setWorkId(event.target.value)}>
                            <option value="">Elegí una obra</option>
                            {works.map((work) => <option key={work.id} value={work.id}>{work.name}</option>)}
                        </select>
                    </label>
                    <button type="button" className={button + ' disabled:opacity-50'} disabled={!works.some((work) => work.id === workId)} onClick={loadWork}>Usar datos de la obra</button>
                    {budget && <button type="button" className={button + ' disabled:opacity-50'} disabled={!items.some((item) => item.workId === workId)} onClick={loadItems}>
                        Agregar ítems al alcance
                    </button>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {([
                        ['number', 'Número'], ['date', 'Fecha de emisión'], ['client', 'Cliente'], ['detail', 'Detalle / Dirección'],
                    ] as const).map(([key, title]) => (
                        <label key={key} className={label}>{title}
                            <input className={input} type={key === 'date' ? 'date' : 'text'} value={draft[key]}
                                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                        </label>
                    ))}
                </div>
                <label className={label}>{budget ? 'Objeto del presupuesto' : 'Texto del informe'}
                    <textarea className={input} rows={budget ? 3 : 12} value={draft.description}
                        onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                </label>
                {!budget && state?.internalSummary && <button type="button" className={button}
                    disabled={draft.description.includes(state.internalSummary)}
                    onClick={() => setDraft({ ...draft, description: [draft.description, state.internalSummary].filter(Boolean).join('\n\n') })}>
                    Agregar resumen financiero interno
                </button>}
                {budget && <>
                    <h2 className="font-bold">Alcance de los trabajos</h2>
                    {draft.sections.map((section, index) => (
                        <fieldset key={index} className="space-y-2 rounded-lg border border-[#E5E7EB] p-3">
                            <legend className="px-1 text-sm font-bold">Etapa {index + 1}</legend>
                            <label className={label}>Título<input className={input} value={section.title}
                                onChange={(event) => updateSection(index, 'title', event.target.value)} /></label>
                            <label className={label}>Detalle, un ítem por línea<textarea className={input} rows={3} value={section.content}
                                onChange={(event) => updateSection(index, 'content', event.target.value)} /></label>
                            <button type="button" className={button} onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== index) })}>Quitar etapa</button>
                        </fieldset>
                    ))}
                    <button type="button" className={button} onClick={() => setDraft({ ...draft, sections: [...draft.sections, { title: '', content: '' }] })}>+ Agregar etapa</button>
                    <label className={label}>Aclaraciones técnicas<textarea className={input} rows={3} value={draft.notes}
                        onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className={label}>Precio total<input className={input} value={draft.price}
                            onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
                        <label className={label}>Plazo estimado<input className={input} value={draft.deadline}
                            onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} /></label>
                    </div>
                    <label className={label}>Forma de pago<textarea className={input} rows={3} value={draft.payment}
                        onChange={(event) => setDraft({ ...draft, payment: event.target.value })} /></label>
                </>}
            </section>
            <section className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-[#555]" aria-label="Vista previa de impresión">
                <iframe ref={frame} src={'/plantillas/' + template + '.html'} title="Vista previa del PDF" onLoad={() => setReady(true)}
                    className="block h-[70vh] min-h-96 w-full min-w-[900px]" />
            </section>
        </div>
    );
};
