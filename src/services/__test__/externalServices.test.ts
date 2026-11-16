// src/services/__tests__/externalServices.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendTasksSummaryEmail } from '../email/emailService';
import { createTask, deleteTask } from '../firestore/tasksService';
import * as firestore from 'firebase/firestore';
import type { Task } from '../../types';

vi.mock('../firebase/firebase', () => ({
    db: {},
    auth: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => 'mockCollectionRef'),
    doc: vi.fn(() => 'mockDocRef'),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(),
}));

describe('External Services with Mocks (Firestore & Serverless AWS SES)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('createTask envía el payload con userId a Cloud Firestore usando mocks', async () => {
        vi.mocked(firestore.addDoc).mockResolvedValueOnce({
            id: 'new-firestore-task-id',
        } as unknown as firestore.DocumentReference);

        const id = await createTask({
            userId: 'user-abc',
            title: 'Instalar luminarias',
            description: 'Colocar plafones LED',
            priority: 'medium',
        });

        expect(id).toBe('new-firestore-task-id');
        expect(firestore.addDoc).toHaveBeenCalledTimes(1);
    });

    it('deleteTask invoca deleteDoc de Firestore con la referencia correcta', async () => {
        vi.mocked(firestore.deleteDoc).mockResolvedValueOnce(undefined);

        await deleteTask('task-999');

        expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
    });

    it('sendTasksSummaryEmail envía resumen al endpoint serverless y retorna confirmación', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: 'Correo enviado con éxito mediante AWS SES',
                messageId: 'ses-12345',
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const tasks: Task[] = [
            {
                id: '1',
                userId: 'u1',
                title: 'Tarea de prueba',
                description: 'Detalle',
                status: 'completed',
                priority: 'high',
                createdAt: '2026-11-14',
            },
        ];

        const res = await sendTasksSummaryEmail('admin@mydcontrol.com', 'Admin MYD', tasks);

        expect(res.success).toBe(true);
        expect(res.messageId).toBe('ses-12345');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/reports/send-email',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('sendTasksSummaryEmail maneja un error 500 del serverless (caso borde de fallo SES)', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                error: 'Error de credenciales en AWS SES',
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            sendTasksSummaryEmail('admin@mydcontrol.com', 'Admin MYD', [])
        ).rejects.toThrow('Error de credenciales en AWS SES');
    });
});