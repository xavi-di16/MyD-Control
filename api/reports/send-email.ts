// api/reports/send-email.ts
import nodemailer from 'nodemailer';

interface RequestTaskItem {
    title: string;
    description?: string;
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

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDueDate(dueDate?: string): string {
    if (!dueDate) return 'Sin fecha límite';
    const parts = dueDate.split('-');
    if (parts.length !== 3) return `Vence ${escapeHtml(dueDate)}`;

    const months = [
        'ene',
        'feb',
        'mar',
        'abr',
        'may',
        'jun',
        'jul',
        'ago',
        'sep',
        'oct',
        'nov',
        'dic',
    ];
    const year = parts[0];
    const monthIndex = Number(parts[1]) - 1;
    const day = Number(parts[2]);

    if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11 || Number.isNaN(day)) {
        return `Vence ${escapeHtml(dueDate)}`;
    }

    return `Vence ${day} de ${months[monthIndex]} de ${year}`;
}

function getPriorityBadgeHtml(priority: string): string {
    const normalized = (priority || 'medium').toLowerCase();
    if (normalized === 'high') {
        return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background-color:#FEF2F2;color:#B91C1C;font-size:11px;font-weight:700;">Alta</span>';
    }
    if (normalized === 'low') {
        return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background-color:#F3F4F6;color:#4B5563;font-size:11px;font-weight:700;">Baja</span>';
    }
    return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background-color:#FEF9C3;color:#854D0E;font-size:11px;font-weight:700;">Media</span>';
}

function renderTaskListCard(title: string, items: RequestTaskItem[], emptyMessage: string): string {
    const bodyHtml =
        items.length === 0
            ? `<div style="padding:18px 20px;font-size:13px;color:#717784;">${escapeHtml(emptyMessage)}</div>`
            : items
                .map((task, index) => {
                    const borderStyle =
                        index < items.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : '';
                    return `
              <div style="padding:14px 20px;${borderStyle}">
                <div style="font-size:14px;font-weight:600;color:#171717;margin-bottom:6px;">
                  ${escapeHtml(task.title)}
                </div>
                <div style="font-size:12px;color:#717784;">
                  ${getPriorityBadgeHtml(task.priority)}
                  <span style="margin-left:8px;vertical-align:middle;">${formatDueDate(task.dueDate)}</span>
                </div>
              </div>
            `;
                })
                .join('');

    return `
    <div style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-top:16px;">
      <div style="padding:14px 20px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:700;color:#171717;">
        ${escapeHtml(title)}
      </div>
      ${bodyHtml}
    </div>
  `;
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

        const gmailUser = process.env.GMAIL_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
        const appUrl = (process.env.APP_URL || 'https://myd-control.vercel.app').replace(/\/$/, '');

        if (!gmailUser || !gmailAppPassword) {
            return res.status(500).json({
                error:
                    'Faltan variables de entorno de Gmail SMTP en el servidor (GMAIL_USER, GMAIL_APP_PASSWORD).',
            });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: gmailUser,
                pass: gmailAppPassword.replace(/\s+/g, ''),
            },
        });

        const pendingTasks = tasks.filter((t) => t.status !== 'completed');
        const completedTasks = tasks.filter((t) => t.status === 'completed');
        const total = tasks.length;
        const completedCount = completedTasks.length;
        const pendingCount = pendingTasks.length;
        const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        const htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>MYD Control - Resumen de tus tareas</title>
        </head>
        <body style="margin:0;padding:36px 16px;background-color:#F5F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;color:#171717;">
          <div style="max-width:560px;margin:0 auto;">
            <!-- Identidad Minimalista MYD -->
            <div style="margin-bottom:16px;padding-left:2px;">
              <span style="font-size:21px;font-weight:800;letter-spacing:-0.03em;color:#171717;">
                MYD Control<span style="color:#F5C518;">.</span>
              </span>
            </div>

            <!-- Tarjeta Hero Oscura con Progreso -->
            <div style="background-color:#171717;border-radius:16px;padding:24px 26px;color:#FFFFFF;">
              <h1 style="margin:0 0 18px 0;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">
                Resumen de tus tareas
              </h1>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:10px;">
                <tr>
                  <td style="font-size:13px;font-weight:600;color:#D4D4D8;text-align:left;vertical-align:bottom;">
                    Progreso
                  </td>
                  <td style="font-size:22px;font-weight:800;color:#F5C518;text-align:right;vertical-align:bottom;font-variant-numeric:tabular-nums;">
                    ${progressPercent}%
                  </td>
                </tr>
              </table>

              <div style="width:100%;height:7px;background-color:#2E2E2E;border-radius:999px;overflow:hidden;">
                <div style="width:${progressPercent}%;height:7px;background-color:#F5C518;border-radius:999px;"></div>
              </div>

              <p style="margin:10px 0 0 0;font-size:12px;color:#A1A1AA;">
                ${userName ? `${escapeHtml(userName)} · ` : ''}${completedCount} de ${total} tareas completadas
              </p>
            </div>

            <!-- Tarjetas KPI lado a lado -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;">
              <tr>
                <td width="48.5%" style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 18px;vertical-align:top;">
                  <div style="font-size:12px;font-weight:600;color:#92400E;margin-bottom:6px;">Pendientes</div>
                  <div style="font-size:24px;font-weight:800;color:#171717;line-height:1;">${pendingCount}</div>
                </td>
                <td width="3%"></td>
                <td width="48.5%" style="background-color:#ECFDF5;border:1px solid #D1FAE5;border-radius:12px;padding:16px 18px;vertical-align:top;">
                  <div style="font-size:12px;font-weight:600;color:#065F46;margin-bottom:6px;">Completadas</div>
                  <div style="font-size:24px;font-weight:800;color:#171717;line-height:1;">${completedCount}</div>
                </td>
              </tr>
            </table>

            <!-- Listado de Tareas Pendientes -->
            ${renderTaskListCard(
            'Tareas pendientes',
            pendingTasks,
            'No tienes tareas pendientes en este momento.'
        )}

            <!-- Listado de Tareas Completadas -->
            ${renderTaskListCard(
            'Tareas completadas',
            completedTasks,
            'Todavía no registraste tareas completadas.'
        )}

            <!-- Botón CTA Minimalista MYD -->
            <div style="text-align:center;margin-top:24px;">
              <a
                href="${appUrl}/tasks"
                style="display:inline-block;background-color:#F5C518;color:#171717;text-decoration:none;font-size:13px;font-weight:700;padding:12px 26px;border-radius:10px;"
              >
                Abrir mis tareas
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

        const info = await transporter.sendMail({
            from: `"MYD Control" <${gmailUser}>`,
            to: recipientEmail,
            subject: `MYD Control · Resumen de tareas (${progressPercent}% completado)`,
            html: htmlBody,
        });

        return res.status(200).json({
            message: 'Correo de resumen enviado con éxito mediante Gmail SMTP.',
            messageId: info.messageId,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido en Nodemailer';
        return res.status(500).json({
            error: `Error al enviar email con Gmail SMTP: ${errorMessage}`,
        });
    }
}