import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const calendarApi = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const tokenApi = 'https://oauth2.googleapis.com/token';
export const calendarScope = 'https://www.googleapis.com/auth/calendar.events.owned';
const zone = 'America/Argentina/Buenos_Aires';

export interface CalendarConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenKey: Buffer;
}

export const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const nonce = () => randomBytes(32).toString('base64url');

export const googleSettings = (config: CalendarConfig, refreshToken: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', config.tokenKey, iv);
    const ciphertext = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
    return { payload: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
};

type Settings = ReturnType<typeof googleSettings>;

const refreshTokenFrom = (config: CalendarConfig, settings: Settings) => {
    const decipher = createDecipheriv('aes-256-gcm', config.tokenKey, Buffer.from(settings.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(settings.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(settings.payload, 'base64')), decipher.final()]).toString('utf8');
};

export const createGoogleConsent = async (db: Firestore, uid: string, config: CalendarConfig) => {
    const state = nonce();
    const verifier = nonce();
    await db.collection('calendarOAuth').doc(sha(state)).create({
        uid, verifier, expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
        client_id: config.clientId, redirect_uri: config.redirectUri,
        response_type: 'code', scope: calendarScope, access_type: 'offline',
        prompt: 'consent select_account', state, code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    }).toString();
    return url.href;
};

const requestTokens = async (config: CalendarConfig, parameters: Record<string, string>) => {
    const response = await fetch(tokenApi, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Google no autorizó la conexión. Volvé a conectar Google Calendar.');
    return await response.json() as { access_token: string; refresh_token?: string };
};

export const finishGoogleConsent = async (db: Firestore, config: CalendarConfig, state: string, code: string) => {
    if (!/^[\w-]{43}$/.test(state) || !code) throw new Error('Autorización inválida.');
    const ref = db.collection('calendarOAuth').doc(sha(state));
    const pending = await db.runTransaction(async (transaction) => {
        const data = (await transaction.get(ref)).data();
        if (!data || data.expiresAt.toMillis() <= Date.now()) throw new Error('La autorización venció.');
        transaction.delete(ref);
        return { uid: data.uid as string, verifier: data.verifier as string };
    });
    if ((await db.collection('employeeProfiles').doc(pending.uid).get()).exists) throw new Error('El perfil no administra un calendario.');
    const tokens = await requestTokens(config, {
        grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: pending.verifier,
    });
    if (!tokens.refresh_token) throw new Error('Google no devolvió acceso continuo.');
    await db.collection('calendarConnections').doc(pending.uid).set(googleSettings(config, tokens.refresh_token));
};

type DatedTask = { dueDate: string; title: string; description?: string };
interface GoogleEvent {
    id: string;
    extendedProperties?: { private?: { mydTask?: string; mydVersion?: string } };
}

export const taskCalendarEvent = (task: DatedTask, taskId: string, calendarOwner: string) => {
    const summary = 'MYD · ' + task.title;
    const description = task.description ?? '';
    return {
        summary, description,
        start: { dateTime: task.dueDate + 'T09:00:00', timeZone: zone },
        end: { dateTime: task.dueDate + 'T09:15:00', timeZone: zone },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
        extendedProperties: { private: {
            mydOwner: calendarOwner,
            mydTask: taskId,
            mydVersion: sha(JSON.stringify([summary, description, task.dueDate])),
        } },
    };
};

const calendarRequest = (token: string, suffix: string, method = 'GET', event?: object) => fetch(calendarApi + suffix, {
    method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: event ? JSON.stringify(event) : undefined,
    signal: AbortSignal.timeout(8000),
});

const requireGoogleSuccess = (response: Response) => {
    if (!response.ok) throw new Error('Google Calendar rechazó la actualización. Revisá la conexión y volvé a sincronizar.');
};

export const reconcileCalendar = async (db: Firestore, uid: string, projectId: string, config: CalendarConfig) => {
    const connection = db.collection('calendarConnections').doc(uid);
    const lease = db.collection('calendarSyncLocks').doc(uid);
    const leaseId = nonce();
    const settings = await db.runTransaction(async (transaction) => {
        const saved = (await transaction.get(connection)).data() as Settings | undefined;
        if (!saved) return 'disconnected';
        const lock = (await transaction.get(lease)).data();
        if (lock && lock.until > Date.now()) return 'busy';
        transaction.set(lease, { leaseId, until: Date.now() + 120_000 });
        return saved;
    });
    if (typeof settings === 'string') return settings;
    const deadline = Date.now() + 55_000;
    const checkDeadline = () => {
        if (Date.now() > deadline) throw new Error('La sincronización quedó parcial. Volvé a sincronizar para completar las tareas restantes.');
    };

    try {
        const calendarOwner = sha(projectId + '/' + uid);
        const { access_token } = await requestTokens(config, { grant_type: 'refresh_token', refresh_token: refreshTokenFrom(config, settings) });
        const [snapshot, owners] = await Promise.all([
            db.collection('tasks').where('userId', '==', uid).get(),
            db.collection('employees').where('userId', '==', uid).where('isOwner', '==', true).get(),
        ]);
        const ownerIds = new Set(owners.docs.map((employee) => employee.id));
        const tasks = new Map(snapshot.docs.filter((document) => {
            const { status, dueDate, title, employeeId } = document.data();
            return status !== 'completed' && typeof title === 'string' && typeof dueDate === 'string'
                && (!employeeId || ownerIds.has(employeeId))
                && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
                && new Date(dueDate + 'T00:00:00Z').toJSON()?.slice(0, 10) === dueDate;
        }).map((document) => [document.id, document.data() as DatedTask]));

        const existing = new Map<string, GoogleEvent>();
        const extra: GoogleEvent[] = [];
        let pageToken: string | undefined;
        do {
            checkDeadline();
            const query = new URLSearchParams({ privateExtendedProperty: 'mydOwner=' + calendarOwner, maxResults: '250' });
            if (pageToken) query.set('pageToken', pageToken);
            const response = await calendarRequest(access_token, '?' + query);
            requireGoogleSuccess(response);
            const page = await response.json() as { items?: GoogleEvent[]; nextPageToken?: string };
            for (const event of page.items ?? []) {
                const taskId = event.extendedProperties?.private?.mydTask;
                if (!taskId || existing.has(taskId)) extra.push(event);
                else existing.set(taskId, event);
            }
            pageToken = page.nextPageToken;
        } while (pageToken);

        for (const event of existing.values()) {
            const taskId = event.extendedProperties?.private?.mydTask;
            if (!taskId || !tasks.has(taskId)) extra.push(event);
        }
        for (const event of extra) {
            checkDeadline();
            const response = await calendarRequest(access_token, '/' + encodeURIComponent(event.id), 'DELETE');
            if (![404, 410].includes(response.status)) requireGoogleSuccess(response);
        }
        for (const [id, task] of tasks) {
            checkDeadline();
            const event = taskCalendarEvent(task, id, calendarOwner);
            const old = existing.get(id);
            if (old?.extendedProperties?.private?.mydVersion === event.extendedProperties.private.mydVersion) continue;
            if (old) {
                const patched = await calendarRequest(access_token, '/' + encodeURIComponent(old.id), 'PATCH', event);
                if (![404, 410].includes(patched.status)) {
                    requireGoogleSuccess(patched);
                    continue;
                }
            }
            const eventId = sha(calendarOwner + '/' + id);
            let created = await calendarRequest(access_token, '', 'POST', { ...event, id: eventId });
            if (created.status === 409) {
                // Google conserva las IDs eliminadas. Una tarea reabierta puede necesitar una ID nueva.
                created = await calendarRequest(access_token, '', 'POST', { ...event, id: randomBytes(24).toString('hex') });
            }
            requireGoogleSuccess(created);
        }
        return 'connected';
    } finally {
        await db.runTransaction(async (transaction) => {
            if ((await transaction.get(lease)).data()?.leaseId === leaseId) transaction.delete(lease);
        });
    }
};
