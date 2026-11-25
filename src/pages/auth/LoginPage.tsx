// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
    const { user, loginWithEmail, registerWithEmail, loginWithGoogle, error, clearError } = useAuth();
    const { state } = useLocation();
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (user) {
        const from = state?.from;
        const pathname = from?.pathname;
        const redirect = typeof pathname === 'string' && pathname.startsWith('/')
            && !pathname.startsWith('//') && !pathname.startsWith('/\\') && pathname !== '/login'
            ? { pathname, search: from.search, hash: from.hash }
            : '/';
        return <Navigate to={redirect} replace />;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email.trim() || !password.trim()) {
            setLocalError('Por favor completa todos los campos obligatorios.');
            return;
        }

        if (isRegistering && password.length < 6) {
            setLocalError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setSubmitting(true);
        try {
            if (isRegistering) {
                await registerWithEmail(email, password, name);
            } else {
                await loginWithEmail(email, password);
            }
        } catch {
            // El error queda gestionado en AuthContext
        } finally {
            setSubmitting(false);
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setLocalError(null);
        clearError();
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F5F6F8]">
            {/* Panel Institucional Izquierdo (Identidad MYD) */}
            <div className="hidden lg:flex lg:col-span-5 bg-[#171717] text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F5C518] text-[#171717] font-extrabold text-base flex items-center justify-center tracking-tighter">
                            MYD
                        </div>
                        <div>
                            <span className="text-base font-bold tracking-tight text-white block">
                                MYD CONTROL
                            </span>
                            <span className="text-xs text-neutral-400">
                                Sistema Integral de Gestión Empresarial
                            </span>
                        </div>
                    </div>

                    <div className="mt-16 space-y-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#252525] border border-[#F5C518]/30 text-[#F5C518] text-xs font-semibold">
                            PLATAFORMA OPERATIVA Y FINANCIERA
                        </span>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                            Cada obra, cada movimiento y cada decisión bajo control.
                        </h1>
                        <p className="text-sm text-neutral-400 leading-relaxed">
                            Centraliza el seguimiento geográfico de obras, liquidación automática de jornales,
                            control de presupuestos, flujo de caja y cierres semanales en una única plataforma.
                        </p>
                    </div>

                    <div className="mt-10 space-y-3 border-t border-[#252525] pt-8">
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded bg-[#F5C518]/15 text-[#F5C518] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                01
                            </span>
                            <div>
                                <p className="text-xs font-semibold text-white">Mapa Interactivo de Obras</p>
                                <p className="text-xs text-neutral-400">
                                    Monitoreo en tiempo real de presupuestos, cobranzas pendientes y rentabilidad.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded bg-[#F5C518]/15 text-[#F5C518] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                02
                            </span>
                            <div>
                                <p className="text-xs font-semibold text-white">Liquidación Exacta de Personal</p>
                                <p className="text-xs text-neutral-400">
                                    Cálculo automatizado de jornales, adelantos, reintegros y saldos por empleado.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded bg-[#F5C518]/15 text-[#F5C518] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                03
                            </span>
                            <div>
                                <p className="text-xs font-semibold text-white">Cierres Semanales y Reportes PDF</p>
                                <p className="text-xs text-neutral-400">
                                    Separación contable de Caja MYD y gastos domésticos con exportación ejecutiva.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 pt-8 border-t border-[#252525] flex items-center justify-between text-xs text-neutral-500">
                    <span>MYD Obras y Servicios</span>
                    <span className="text-[#F5C518] font-medium">v1.0 · Edición Corporativa</span>
                </div>
            </div>

            {/* Panel Derecho: Formulario de Autenticación */}
            <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
                <div className="max-w-md w-full bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-8 sm:p-10">
                    {/* Encabezado móvil de marca */}
                    <div className="flex lg:hidden items-center gap-2.5 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[#171717] text-[#F5C518] font-extrabold text-xs flex items-center justify-center">
                            MYD
                        </div>
                        <span className="text-sm font-bold text-[#171717]">MYD CONTROL</span>
                    </div>

                    <div className="mb-6">
                        <span className="inline-block px-2.5 py-1 bg-[#F5C518]/20 text-[#171717] text-[11px] font-bold rounded-md mb-2">
                            ACCESO ADMINISTRATIVO
                        </span>
                        <h2 className="text-2xl font-bold text-[#171717] tracking-tight">
                            {isRegistering ? 'Crear cuenta de Administrador' : 'Iniciar sesión en MYD Control'}
                        </h2>
                        <p className="text-[#717784] text-xs mt-1">
                            {isRegistering
                                ? 'Configura tus credenciales para administrar obras, caja y personal.'
                                : 'Ingresa tus credenciales para acceder al panel operativo y financiero.'}
                        </p>
                    </div>

                    {(localError || error) && (
                        <div
                            role="alert"
                            className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5"
                        >
                            <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{localError || error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {isRegistering && (
                            <div>
                                <label htmlFor="name" className="block text-xs font-semibold text-[#171717] mb-1.5">
                                    Nombre completo
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Sergio Maldonado"
                                    className="w-full px-3.5 py-2.5 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm placeholder:text-[#717784]/70 focus:outline-none focus:border-[#171717] focus:ring-2 focus:ring-[#F5C518]/40 transition"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-[#171717] mb-1.5">
                                Correo electrónico corporativo
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@mydcontrol.com"
                                required
                                className="w-full px-3.5 py-2.5 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm placeholder:text-[#717784]/70 focus:outline-none focus:border-[#171717] focus:ring-2 focus:ring-[#F5C518]/40 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-[#171717] mb-1.5">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-3.5 py-2.5 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm placeholder:text-[#717784]/70 focus:outline-none focus:border-[#171717] focus:ring-2 focus:ring-[#F5C518]/40 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 px-4 bg-[#F5C518] hover:bg-[#E0AD00] active:bg-[#c99b00] disabled:opacity-50 text-[#171717] font-bold rounded-lg text-sm transition shadow-xs cursor-pointer"
                        >
                            {submitting
                                ? 'Verificando acceso...'
                                : isRegistering
                                    ? 'Crear Cuenta de Administrador'
                                    : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-3">
                        <div className="h-px bg-[#E5E7EB] flex-1" />
                        <span className="text-[11px] font-medium text-[#717784] uppercase tracking-wider">
                            o acceso rápido
                        </span>
                        <div className="h-px bg-[#E5E7EB] flex-1" />
                    </div>

                    <button
                        type="button"
                        onClick={loginWithGoogle}
                        disabled={submitting}
                        className="w-full py-2.5 px-4 bg-white hover:bg-[#F5F6F8] border border-[#E5E7EB] text-[#171717] font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="#EA4335"
                                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                            />
                            <path
                                fill="#4285F4"
                                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 17c1.9 3.9 5.8 7 10.4 7z"
                            />
                        </svg>
                        Continuar con Google
                    </button>

                    <p className="text-center text-xs text-[#717784] mt-6">
                        {isRegistering ? '¿Ya tienes una cuenta registrada?' : '¿Necesitas registrar un nuevo administrador?'}{' '}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-[#171717] font-bold underline decoration-[#F5C518] decoration-2 underline-offset-4 hover:text-[#E0AD00] ml-1 cursor-pointer"
                        >
                            {isRegistering ? 'Inicia sesión' : 'Regístrate aquí'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
