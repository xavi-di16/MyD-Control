// api/reports/send-email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

interface RequestTaskItem {
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate?: string;
}

interface RequestBody {
    recipientEmail?: string;
    userName?: string;
    tasks?: RequestTaskItem[];
}

interface VercelRequestLike {
    method?: string;
    body?: RequestBody | string;
}

interface VercelResponseLike {
    status: (code: number) => VercelResponseLike;
    json: (data: Record<string, unknown>) => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    try {
        const parsedBody: RequestBody =
            typeof req.body === 'string' ? (JSON.parse(req.body) as RequestBody) : req.body || {};

        const { recipientEmail, userName, tasks } = parsedBody;

        if (!recipientEmail || !Array.isArray(tasks)) {
            return res.status(400).json({
                error: 'Datos inválidos: se requiere recipientEmail y el listado de tareas.',
            });
        }

        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const senderEmail = process.env.AWS_SES_SENDER_EMAIL || recipientEmail;

        if (!region || !accessKeyId || !secretAccessKey) {
            return res.status(500).json({
                error: 'Faltan variables de entorno de AWS SES en el servidor (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).',
            });
        }

        const sesClient = new SESClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === 'completed').length;
        const pending = total - completed;

        const rowsHtml =
            tasks.length === 0
                ? '<tr><td colspan="4" style="padding:10px;text-align:center;">No hay tareas registradas.</td></tr>'
                : tasks
                    .map(
                        (t) => `
          <tr>
            <td style="padding:8px;border:1px solid #cbd5e1;"><strong>${t.title}</strong><br/><small>${t.description || ''}</small></td>
            <td style="padding:8px;border:1px solid #cbd5e1;">${t.status === 'completed' ? 'Completada' : 'Pendiente'}</td>
            <td style="padding:8px;border:1px solid #cbd5e1;">${t.priority.toUpperCase()}</td>
            <td style="padding:8px;border:1px solid #cbd5e1;">${t.dueDate || '-'}</td>
          </tr>`
                    )
                    .join('');

        const htmlBody = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:640px;margin:0 auto;">
        <h2 style="color:#d97706;">MYD Control · Resumen de Estado de Tareas</h2>
        <p>Hola <strong>${userName || recipientEmail}</strong>, este es el resumen actualizado de tus tareas operativas:</p>
        <ul>
          <li><strong>Total de tareas:</strong> ${total}</li>
          <li><strong>Completadas:</strong> ${completed}</li>
          <li><strong>Pendientes:</strong> ${pending}</li>
        </ul>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;">
              <th style="padding:8px;border:1px solid #cbd5e1;">Tarea</th>
              <th style="padding:8px;border:1px solid #cbd5e1;">Estado</th>
              <th style="padding:8px;border:1px solid #cbd5e1;">Prioridad</th>
              <th style="padding:8px;border:1px solid #cbd5e1;">Vencimiento</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

        const command = new SendEmailCommand({
            Source: senderEmail,
            Destination: {
                ToAddresses: [recipientEmail],
            },
            Message: {
                Subject: {
                    Data: `MYD Control - Resumen de Tareas (${completed}/${total} completadas)`,
                    Charset: 'UTF-8',
                },
                Body: {
                    Html: {
                        Data: htmlBody,
                        Charset: 'UTF-8',
                    },
                },
            },
        });

        const result = await sesClient.send(command);

        return res.status(200).json({
            message: 'Correo de resumen enviado con éxito mediante AWS SES.',
            messageId: result.MessageId,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido en AWS SES';
        return res.status(500).json({
            error: `Error al enviar email con AWS SES: ${errorMessage}`,
        });
    }
}