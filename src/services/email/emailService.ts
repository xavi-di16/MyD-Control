// src/services/email/emailService.ts
import type { Task } from '../../types';

export interface SendTaskSummaryPayload {
    recipientEmail: string;
    userName: string;
    tasks: Array<{
        title: string;
        description: string;
        status: string;
        priority: string;
        dueDate?: string;
    }>;
}

export interface SendEmailResponse {
    success: boolean;
    message: string;
    messageId?: string;
}

export const sendTasksSummaryEmail = async (
    recipientEmail: string,
    userName: string,
    tasks: Task[]
): Promise<SendEmailResponse> => {
    if (!recipientEmail.trim()) {
        throw new Error('El correo electrónico del destinatario es obligatorio.');
    }

    const payload: SendTaskSummaryPayload = {
        recipientEmail: recipientEmail.trim(),
        userName: userName || recipientEmail,
        tasks: tasks.map((t) => ({
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
        })),
    };

    const response = await fetch('/api/reports/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    let data: { message?: string; error?: string; messageId?: string } = {};
    const contentType = response.headers?.get?.('content-type') || '';
    if (typeof response.json === 'function' && (!contentType || contentType.includes('application/json'))) {
        try {
            data = (await response.json()) as { message?: string; error?: string; messageId?: string };
        } catch {
            data = {};
        }
    } else if (typeof response.text === 'function') {
        const text = await response.text();
        if (!response.ok) {
            throw new Error(
                response.status === 404 || text.includes('<!doctype')
                    ? 'El servicio de envío de email no está disponible en este servidor local (requiere despliegue en Vercel con credenciales SMTP o API configuradas).'
                    : `Error del servidor (${response.status}): ${text.slice(0, 150)}`
            );
        }
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || `No se pudo enviar el correo de resumen (código ${response.status}).`);
    }

    return {
        success: true,
        message: data.message || 'Resumen enviado correctamente por correo electrónico.',
        messageId: data.messageId,
    };
};