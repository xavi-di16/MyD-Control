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