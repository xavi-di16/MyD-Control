<!-- README.md -->
# MYD Control · Sistema Integral de Gestión Administrativa, Operativa y Financiera

**MYD Control** es una Single Page Application (SPA) desarrollada con **React, TypeScript, Firebase y AWS SES (vía Vercel Functions)**. Combina todos los requerimientos técnicos del **Proyecto Integrador del Módulo 4** (Gestor Estratégico de Tareas con persistencia en la nube, autenticación y notificaciones por correo) con las necesidades reales de gestión de obras, jornales de empleados, caja financiera, presupuestos y cierres semanales en PDF.

---

## 🌐 Demo en Producción
- **URL Pública (Vercel):** `https://myd-control.vercel.app` *(Reemplazar por tu URL final tras el deploy)*

---

## 🏗️ Decisiones Arquitectónicas y Estructura por Capas

El proyecto se diseñó siguiendo una arquitectura modular por capas para separar claramente la interfaz de usuario de la lógica de negocio y el acceso a datos:

```text
MYD_CONTROL/
├── api/
│   └── reports/
│       └── send-email.ts          # Vercel Serverless Function con AWS SES SDK
├── src/
│   ├── components/                # Componentes UI reutilizables y desacoplados
│   │   ├── layout/MainLayout.tsx  # Navegación responsive Mobile-First
│   │   └── tasks/                 # TodoForm.tsx, TodoList.tsx y sus tests
│   ├── contexts/
│   │   └── AuthContext.tsx        # Estado global de sesión con onAuthStateChanged
│   ├── hooks/
│   │   └── useTasks.ts            # Custom hook con suscripción onSnapshot y cleanup
│   ├── pages/                     # Vistas principales (Auth, Dashboard, Tasks, Works, Employees, Finance, Budgets, Reports)
│   ├── routes/
│   │   └── RequireAuth.tsx        # Protección de rutas privadas sin parpadeos de sesión
│   ├── services/                  # Capa de integración externa (Firebase, Firestore, Email API)
│   ├── types/
│   │   └── index.ts               # Contratos e interfaces TypeScript estrictas (sin uso de any)
│   └── utils/
│       └── calculations.ts        # Funciones puras para cálculo de jornales y rentabilidad
├── firestore.rules                # Reglas de aislamiento de datos por userId
└── vite.config.ts                 # Configuración de Vite, Tailwind CSS y Vitest
## Perfiles, PDFs y Google Calendar

Publicá `firestore.rules` en el proyecto de Firebase que usa producción antes de activar esta versión. Las reglas permiten que una cuenta de empleado lea sus tareas personales y las asignadas a su ficha. Los empleados pueden cambiar el estado de las tareas asignadas. La información de administración queda disponible en las cuentas administradoras.

- **Empleados.** En la nómina, elegí **Invitar** y compartí el enlace privado con la persona. El enlace habilita una ficha, vence en siete días y se puede usar una sola vez. El empleado crea su cuenta o inicia sesión y confirma la ficha al abrirlo.
- **Presupuestos.** La opción **Preparar presupuesto PDF** permite cargar datos e ítems de una obra y editar las etapas, el precio y la forma de pago antes de imprimir.
- **Cierres.** La opción **Preparar informe PDF** carga el período y las observaciones. El resumen financiero interno se agrega a pedido. En ambos editores, **Imprimir / Guardar PDF** abre el diálogo del navegador con la plantilla original.

### Activar los avisos en Google Calendar

Habilitá Google Calendar API en Google Cloud y creá un cliente OAuth de tipo **Aplicación web**. Registrá `https://myd-control.vercel.app/api/calendar/google` como URI de redirección autorizada para producción. Si la pantalla de consentimiento está en modo de prueba, agregá la cuenta de Sergio a los usuarios de prueba.

Configurá estas variables de servidor en Vercel.

| Variable | Valor |
| --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | ID del cliente OAuth web |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Secreto del cliente OAuth web |
| `GOOGLE_CALENDAR_REDIRECT_URI` | La misma URI autorizada en Google Cloud |
| `GOOGLE_CALENDAR_TOKEN_KEY` | Una clave aleatoria de 32 bytes en Base64, por ejemplo con `openssl rand -base64 32` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON de una cuenta de servicio del proyecto de producción con acceso de lectura y escritura a Firestore |

El servidor usa el proyecto indicado en `VITE_FIREBASE_PROJECT_ID`. Ingresá los valores sensibles en Vercel. Conservá la misma clave de cifrado mientras existan conexiones activas.

Después de desplegar, Sergio autoriza su cuenta desde **Tareas → Conectar mi Google Calendar**. Las tareas pendientes con fecha que estén sin asignar o asignadas a su ficha **Propietario** generan eventos a las 09:00 de Argentina y un aviso 30 minutos antes. Las modificaciones de las tareas se reflejan en el calendario al sincronizar. Los avisos de eventos ya sincronizados los entrega Google Calendar aun con MyD Control cerrado.
