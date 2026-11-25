// src/components/onboarding/OnboardingTour.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface TourStep {
    id: string;
    route: string;
    badge: string;
    title: string;
    description: string;
    tip: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        route: '/',
        badge: 'Bienvenida',
        title: 'Bienvenido a MYD Control',
        description:
            'Esta plataforma centraliza tus obras, tareas diarias, liquidación de empleados, flujo de caja y cierres semanales en un solo lugar.',
        tip: 'Usa el menú lateral izquierdo para moverte entre módulos. Todo se sincroniza en tiempo real en la nube.',
    },
    {
        id: 'dashboard',
        route: '/',
        badge: 'Panel Ejecutivo',
        title: 'Dashboard y Métricas en Vivo',
        description:
            'Visualiza de un vistazo el saldo disponible en caja, las obras en ejecución, el saldo por cobrar a clientes y los jornales pendientes de pago.',
        tip: 'Los accesos rápidos de la barra superior te permiten cargar un movimiento o abrir el mapa al instante.',
    },
    {
        id: 'works',
        route: '/works',
        badge: 'Diferencial MYD',
        title: 'Obras y Mapa Interactivo',
        description:
            'Registra cada proyecto con su ubicación geográfica, presupuesto acordado, cobranzas y costos estimados.',
        tip: 'Tocá un pin o una obra del listado para abrir su ficha. Para ubicar una obra nueva, buscá la localidad y mové el pin.',
    },
    {
        id: 'tasks',
        route: '/tasks',
        badge: 'Operación Diaria',
        title: 'Gestor de Tareas y Resumen por Email',
        description:
            'Organiza compras de materiales y trabajos pendientes por prioridad y fecha de vencimiento, vinculándolos a obras y personal.',
        tip: 'Desde el botón superior puedes enviarte por correo un resumen visual minimalista de tu avance en segundos.',
    },
    {
        id: 'employees',
        route: '/employees',
        badge: 'Personal',
        title: 'Empleados y Liquidación de Jornales',
        description:
            'Administra el plantel (Esteban, Gonzalo, Franco y nuevos ingresos) y liquida cada viernes con cálculo automático.',
        tip: 'El sistema aplica la fórmula (Días × Jornal) − Adelantos + Reintegros y controla pagos parciales o saldados.',
    },
    {
        id: 'finance-reports',
        route: '/finance',
        badge: 'Finanzas y Cierres',
        title: 'Caja, Presupuestos e Informes PDF',
        description:
            'Separa los movimientos operativos de Caja MYD de los gastos domésticos, controla desvíos de materiales en Presupuestos y genera cierres semanales en PDF desde Informes.',
        tip: 'Ya estás listo para operar. Puedes volver a abrir esta guía cuando quieras desde el botón "Guía rápida" arriba.',
    },
];

interface OnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
    onStepRouteChange?: (route: string | null) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
    isOpen,
    onClose,
    onStepRouteChange,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

    const step = TOUR_STEPS[currentIndex];
    const progressPercent = Math.round(((currentIndex + 1) / TOUR_STEPS.length) * 100);

    useEffect(() => {
        if (!isOpen) {
            onStepRouteChange?.(null);
            return;
        }
        const targetRoute = TOUR_STEPS[currentIndex].route;
        navigate(targetRoute);
        onStepRouteChange?.(targetRoute);
    }, [isOpen, currentIndex, navigate, onStepRouteChange]);

    if (!isOpen) return null;

    const isFirst = currentIndex === 0;
    const isLast = currentIndex === TOUR_STEPS.length - 1;

    const handleNext = () => {
        if (isLast) {
            navigate('/');
            setCurrentIndex(0);
            onClose();
            return;
        }
        setCurrentIndex((prev) => prev + 1);
    };

    const handlePrev = () => {
        if (!isFirst) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleSkip = () => {
        setCurrentIndex(0);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-8 bg-black/45 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-step-title"
        >
            <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden">
                {/* Cabecera oscura corporativa con progreso */}
                <div className="bg-[#171717] text-white px-6 py-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#252525] border border-[#F5C518]/30 text-[#F5C518] text-[11px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
                            {step.badge}
                        </span>
                        <span className="text-xs font-mono-num text-neutral-400">
                            Paso {currentIndex + 1} de {TOUR_STEPS.length}
                        </span>
                    </div>

                    <h3 id="tour-step-title" className="text-lg font-bold tracking-tight text-white">
                        {step.title}
                    </h3>

                    {/* Barra de progreso */}
                    <div className="mt-4 w-full h-1.5 bg-[#252525] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#F5C518] transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Cuerpo explicativo */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-[#171717] leading-relaxed">{step.description}</p>

                    <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#F5C518] text-[#171717] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            i
                        </span>
                        <p className="text-xs text-[#78350F] leading-relaxed font-medium">{step.tip}</p>
                    </div>

                    {/* Indicadores de pasos */}
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                        {TOUR_STEPS.map((s, idx) => (
                            <button
                                key={s.id}
                                type="button"
                                aria-label={`Ir al paso ${idx + 1}: ${s.title}`}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === currentIndex
                                    ? 'w-6 bg-[#171717]'
                                    : idx < currentIndex
                                        ? 'w-2 bg-[#F5C518]'
                                        : 'w-2 bg-[#E5E7EB]'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Controles */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="text-xs font-semibold text-[#717784] hover:text-[#171717] transition cursor-pointer"
                        >
                            Omitir recorrido
                        </button>

                        <div className="flex items-center gap-2">
                            {!isFirst && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F5F6F8] hover:bg-neutral-200 text-[#171717] border border-[#E5E7EB] transition cursor-pointer"
                                >
                                    Anterior
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] transition shadow-2xs cursor-pointer"
                            >
                                {isLast ? 'Finalizar recorrido' : 'Siguiente →'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
