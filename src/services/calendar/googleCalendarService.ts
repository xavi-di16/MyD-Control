import type { User } from 'firebase/auth';

export const calendarAction = async (user: User, action: 'state' | 'connect' | 'disconnect' | 'sync', signal?: AbortSignal) => {
    const response = await fetch('/api/calendar/google', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await user.getIdToken() },
        body: JSON.stringify({ action }),
        signal,
    });
    const result = await response.json().catch(() => ({})) as { error?: string; url?: string; state?: string };
    if (!response.ok) throw new Error(result.error || 'Google Calendar todavía no está disponible en este entorno.');
    return result;
};
