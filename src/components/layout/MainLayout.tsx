// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const MainLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { to: '/', label: 'Dashboard', end: true },
        { to: '/tasks', label: 'Tareas' },
        { to: '/works', label: 'Obras y Mapa' },
        { to: '/employees', label: 'Empleados y Jornales' },
        { to: '/finance', label: 'Caja y Finanzas' },
        { to: '/budgets', label: 'Presupuestos' },
        { to: '/reports', label: 'Reportes y Cierre' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
            <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0">
                <div>
                    <div className="p-4 flex items-center justify-between border-b border-slate-800">
                        <div>
                            <span className="text-lg font-bold text-amber-400 tracking-tight">MYD CONTROL</span>
                            <p className="text-xs text-slate-400">Gestión Operativa y Obras</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700"
                        >
                            {mobileMenuOpen ? 'Cerrar' : 'Menú'}
                        </button>
                    </div>

                    <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block p-3 space-y-1`}>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `block px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                                        ? 'bg-amber-500 text-slate-950 font-semibold'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block p-4 border-t border-slate-800`}>
                    <p className="text-xs text-slate-400 truncate mb-2" title={user?.email || ''}>
                        {user?.displayName || user?.email}
                    </p>
                    <button
                        type="button"
                        onClick={logout}
                        className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};