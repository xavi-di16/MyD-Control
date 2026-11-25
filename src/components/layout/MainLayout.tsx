// src/components/layout/MainLayout.tsx
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingTour } from '../../onboarding/OnboardingTour';
import { houseUnderConstruction } from '../../pages/works/workStatus';

interface NavItem {
    to: string;
    label: string;
    shortDesc: string;
    end?: boolean;
    icon: React.ReactNode;
}

export const MainLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [tourOpen, setTourOpen] = useState(false);
    const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null);
    const location = useLocation();

    useEffect(() => {
        if (!user?.uid) return;
        const storageKey = `myd_control_tour_seen_${user.uid}`;
        const alreadySeen = localStorage.getItem(storageKey);
        if (!alreadySeen) {
            const timer = setTimeout(() => setTourOpen(true), 0);
            return () => clearTimeout(timer);
        }
    }, [user?.uid]);

    const handleCloseTour = () => {
        if (user?.uid) {
            localStorage.setItem(`myd_control_tour_seen_${user.uid}`, 'true');
        }
        setTourOpen(false);
        setHighlightedRoute(null);
    };

    const navItems: NavItem[] = [
        {
            to: '/',
            label: 'Dashboard',
            shortDesc: 'Resumen ejecutivo y KPIs',
            end: true,
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
        },
        {
            to: '/works',
            label: 'Obras y Mapa',
            shortDesc: 'Geolocalización y fichas técnicas',
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={houseUnderConstruction} />
                </svg>
            ),
        },
        {
            to: '/tasks',
            label: 'Gestor de Tareas',
            shortDesc: 'Planificación y asignaciones',
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
        {
            to: '/employees',
            label: 'Empleados y Jornales',
            shortDesc: 'Liquidaciones, adelantos y pagos',
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            to: '/finance',
            label: 'Caja y Finanzas',
            shortDesc: 'Flujo MYD, cobranzas y egresos',
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            to: '/budgets',
            label: 'Presupuestos',
            shortDesc: 'Costos estimados vs. reales',
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            to: '/reports',
            label: 'Informes y Cierres',
            shortDesc: 'Reportes semanales PDF y Email',
            icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
    ];

    const currentSection =
        navItems.find((item) =>
            item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
        ) || navItems[0];

    const userInitial = (user?.displayName || user?.email || 'M')[0].toUpperCase();

    return (
        <div className="min-h-screen bg-[#F5F6F8] text-[#171717] flex flex-col lg:flex-row">
            {/* Overlay móvil */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Barra lateral corporativa (Sidebar) */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-68 bg-[#171717] text-white flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div>
                    <div className="h-16 px-5 flex items-center justify-between border-b border-[#252525]">
                        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
                            <div className="w-9 h-9 rounded-lg bg-[#F5C518] text-[#171717] font-extrabold text-sm flex items-center justify-center tracking-tighter shadow-xs group-hover:bg-[#E0AD00] transition">
                                MYD
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold tracking-tight text-white">MYD CONTROL</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#252525] text-[#F5C518] border border-[#F5C518]/30">
                                        PRO
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#9CA3AF] leading-none mt-0.5">
                                    Gestión de Obras y Finanzas
                                </p>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#252525]"
                            aria-label="Cerrar menú"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-3 py-5">
                        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#717784]">
                            Módulos de Gestión
                        </p>
                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const isTourFocused = highlightedRoute === item.to;
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.end}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive
                                                ? 'bg-[#252525] text-white font-semibold shadow-xs'
                                                : 'text-neutral-400 hover:bg-[#252525]/60 hover:text-neutral-100'
                                            } ${isTourFocused ? 'ring-2 ring-[#F5C518] bg-[#252525]' : ''}`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#F5C518] rounded-r" />
                                                )}
                                                <span
                                                    className={`p-1.5 rounded-md transition ${isActive || isTourFocused
                                                        ? 'bg-[#F5C518] text-[#171717]'
                                                        : 'bg-[#252525] text-neutral-400 group-hover:text-white'
                                                        }`}
                                                >
                                                    {item.icon}
                                                </span>
                                                <div className="truncate">
                                                    <span className="block leading-tight">{item.label}</span>
                                                    <span className="block text-[10px] text-neutral-500 truncate mt-0.5">
                                                        {item.shortDesc}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-[#252525] bg-[#141414]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#252525] border border-[#F5C518]/40 text-[#F5C518] font-bold text-xs flex items-center justify-center shrink-0">
                            {userInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">
                                {user?.displayName || 'Administrador MYD'}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate" title={user?.email || ''}>
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={logout}
                        className="w-full py-2 px-3 bg-[#252525] hover:bg-red-950/60 text-neutral-300 hover:text-red-300 border border-neutral-800 hover:border-red-800/50 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Contenedor Principal */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-lg bg-[#F5F6F8] text-[#171717] border border-[#E5E7EB] hover:bg-neutral-200 transition"
                            aria-label="Abrir menú"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[11px] text-[#717784]">
                                <span className="font-semibold text-[#171717]">MYD Control</span>
                                <span>/</span>
                                <span className="truncate">{currentSection.label}</span>
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-[#171717] truncate">
                                {currentSection.shortDesc}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Botón para volver a iniciar el recorrido interactivo */}
                        <button
                            type="button"
                            onClick={() => setTourOpen(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5F6F8] hover:bg-neutral-200 text-[#171717] border border-[#E5E7EB] transition flex items-center gap-1.5 cursor-pointer"
                            title="Iniciar recorrido guiado por MYD Control"
                        >
                            <span className="w-4 h-4 rounded-full bg-[#171717] text-[#F5C518] text-[10px] font-bold flex items-center justify-center">
                                ?
                            </span>
                            <span className="hidden sm:inline">Guía rápida</span>
                        </button>

                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F6F8] border border-[#E5E7EB]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-medium text-[#171717]">
                                Sincronización Activa
                            </span>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <Link
                                to="/finance"
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F5F6F8] hover:bg-neutral-200/80 text-[#171717] border border-[#E5E7EB] transition"
                            >
                                + Movimiento
                            </Link>
                            <Link
                                to="/works"
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5C518] hover:bg-[#E0AD00] text-[#171717] transition shadow-2xs"
                            >
                                Mapa de Obras
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                    <Outlet />
                </main>
            </div>

            {/* Modal de Recorrido Guiado */}
            <OnboardingTour
                isOpen={tourOpen}
                onClose={handleCloseTour}
                onStepRouteChange={setHighlightedRoute}
            />
        </div>
    );
};

export default MainLayout;
