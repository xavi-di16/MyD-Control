import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
    createGoogleConsent, finishGoogleConsent, reconcileCalendar, type CalendarConfig,
} from '../../server/googleCalendar.ts';

interface Request {
    method?: string;
    url?: string;
    body?: string | Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
}

interface Response {
    status(code: number): Response;
    json(body: object): void;
    setHeader(name: string, value: string): void;
    end(): void;
}

const calendarEnvironment = () => {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    const tokenKey = Buffer.from(process.env.GOOGLE_CALENDAR_TOKEN_KEY ?? '', 'base64');
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;
    const emulator = process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST;
    if (!clientId || !clientSecret || !redirectUri || tokenKey.length !== 32 || !projectId || (!emulator && !serviceAccount)) return null;

    const config: CalendarConfig = { clientId, clientSecret, redirectUri, tokenKey };
    const app = getApps().find(({ name }) => name === 'myd-calendar') ?? initializeApp({
        projectId,
        ...(serviceAccount && { credential: cert(JSON.parse(serviceAccount)) }),
    }, 'myd-calendar');
    return { config, app, projectId, db: getFirestore(app) };
};

export default async function handler(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    let environment: ReturnType<typeof calendarEnvironment> = null;
    try {
        environment = calendarEnvironment();
    } catch {
        return res.status(503).json({ error: 'La integración de Google Calendar requiere revisar su configuración.' });
    }
    if (!environment) return res.status(503).json({ error: 'Google Calendar todavía no está configurado en el servidor.' });
    const { config, app, projectId, db } = environment;

    if (req.method === 'GET') {
        const params = new URL(req.url ?? '/', config.redirectUri).searchParams;
        const redirect = new URL('/tasks', config.redirectUri);
        try {
            await finishGoogleConsent(db, config, params.get('state') ?? '', params.get('code') ?? '');
            redirect.searchParams.set('calendar', 'connected');
        } catch {
            redirect.searchParams.set('calendar', 'error');
        }
        res.setHeader('Location', redirect.href);
        return res.status(303).end();
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Iniciá sesión para continuar.' });

    let uid: string;
    try {
        uid = (await getAuth(app).verifyIdToken(authorization.slice(7))).uid;
    } catch {
        return res.status(401).json({ error: 'La sesión venció. Volvé a iniciar sesión.' });
    }

    try {
        const { action } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
        if ((await db.collection('employeeProfiles').doc(uid).get()).exists) {
            return res.status(403).json({ error: 'Esta cuenta tiene acceso a tareas.' });
        }

        const connection = db.collection('calendarConnections').doc(uid);
        if (action === 'state') return res.status(200).json({ state: (await connection.get()).exists ? 'connected' : 'disconnected' });
        if (action === 'connect') return res.status(200).json({ url: await createGoogleConsent(db, uid, config) });
        if (action === 'disconnect') {
            await connection.delete();
            return res.status(200).json({ state: 'disconnected' });
        }
        if (action === 'sync') return res.status(200).json({ state: await reconcileCalendar(db, uid, projectId, config) });
        return res.status(400).json({ error: 'Acción inválida.' });
    } catch {
        return res.status(502).json({ error: 'No se pudo sincronizar con Google Calendar. Revisá la conexión y volvé a intentar.' });
    }
}
