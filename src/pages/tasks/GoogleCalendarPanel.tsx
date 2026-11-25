import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import type { Task } from '../../types';
import { calendarAction } from '../../services/calendar/googleCalendarService';

export const GoogleCalendarPanel = ({ user, tasks, loading }: { user: User; tasks: Task[]; loading: boolean }) => {
    const [params] = useSearchParams();
    const [connection, setConnection] = useState<'checking' | 'connected' | 'disconnected' | 'unavailable'>('checking');
    const [message, setMessage] = useState(params.get('calendar') === 'error' ? 'No se pudo conectar Google Calendar.' : '');
    const [busy, setBusy] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const revision = JSON.stringify(tasks.filter((task) => task.status !== 'completed' && task.dueDate)
        .map((task) => [task.id, task.dueDate, task.title, task.description]));

    useEffect(() => {
        const controller = new AbortController();
        void calendarAction(user, 'state', controller.signal).then(({ state }) => {
            if (!controller.signal.aborted) setConnection(state === 'connected' ? 'connected' : 'disconnected');
        }).catch((error: Error) => {
            if (!controller.signal.aborted) {
                setConnection('unavailable');
                setMessage(error.message);
            }
        });
        return () => controller.abort();
    }, [user]);

    useEffect(() => {
        if (connection !== 'connected' || loading) return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const sync = async (retries = 0) => {
            setBusy(true);
            try {
                const { state } = await calendarAction(user, 'sync', controller.signal);
                if (controller.signal.aborted) return;
                if (state === 'busy' && retries < 3) {
                    timer = setTimeout(() => void sync(retries + 1), 2500);
                    return;
                }
                if (state === 'disconnected') setConnection('disconnected');
                setMessage(state === 'busy' ? 'Hay otra sincronización en curso. Podés volver a intentar.' : 'Calendario actualizado.');
            } catch (error) {
                if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo sincronizar el calendario.');
            } finally {
                if (!controller.signal.aborted) setBusy(false);
            }
        };
        timer = setTimeout(() => void sync(), 600);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [connection, user, loading, revision, refresh]);

    const changeConnection = async () => {
        if (busy) return;
        setBusy(true);
        setMessage('');
        try {
            if (connection === 'connected') {
                await calendarAction(user, 'disconnect');
                setConnection('disconnected');
                setMessage('Calendario desconectado. Los eventos ya creados se conservan en Google Calendar.');
            } else {
                const { url } = await calendarAction(user, 'connect');
                if (!url) throw new Error('No se pudo iniciar la autorización de Google.');
                window.location.assign(url);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la conexión.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4"
            aria-label="Google Calendar">
            <div>
                <h2 className="font-bold">Avisos en Google Calendar</h2>
                <p className="text-sm text-[#525866]">Tus tareas pendientes con fecha generan un evento a las 09:00 y un aviso 30 minutos antes, hora argentina.</p>
                {message && <p role="status" className="mt-1 text-sm">{message}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
                {connection === 'checking' && <span className="text-sm">Verificando conexión…</span>}
                {connection === 'connected' && <button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}
                    className="min-h-11 rounded-lg bg-[#171717] px-3 text-sm font-bold text-[#F5C518] disabled:opacity-50">
                    {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>}
                {(connection === 'connected' || connection === 'disconnected') &&
                    <button type="button" disabled={busy} onClick={() => void changeConnection()}
                        className="min-h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm font-bold disabled:opacity-50">
                        {connection === 'connected' ? 'Desconectar' : 'Conectar mi Google Calendar'}
                    </button>}
            </div>
        </section>
    );
};
