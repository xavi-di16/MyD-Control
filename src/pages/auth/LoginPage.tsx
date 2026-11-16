// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
    const { user, loginWithEmail, registerWithEmail, loginWithGoogle, error, clearError } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (user) {
        return <Navigate to="/" replace />;
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
            // El error ya queda seteado en AuthContext
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
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8">
                <div className="text-center mb-6">
                    <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full mb-2">
                        SISTEMA INTEGRAL DE GESTIÓN
                    </span>
                    <h1 className="text-2xl font-bold text-white">MYD Control</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {isRegistering ? 'Crear cuenta de Administrador' : 'Ingresa a tu panel operativo y financiero'}
                    </p>
                </div>

                {(localError || error) && (
                    <div
                        role="alert"
                        className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                    >
                        {localError || error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {isRegistering && (
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-slate-300 mb-1">
                                Nombre completo
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Administrador MYD"
                                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1">
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@mydcontrol.com"
                            required
                            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-sm transition cursor-pointer"
                    >
                        {submitting
                            ? 'Procesando...'
                            : isRegistering
                                ? 'Registrarme'
                                : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <div className="h-px bg-slate-700 flex-1" />
                    <span className="text-xs text-slate-400">o continuar con</span>
                    <div className="h-px bg-slate-700 flex-1" />
                </div>

                <button
                    type="button"
                    onClick={loginWithGoogle}
                    disabled={submitting}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                    Continuar con Google
                </button>

                <p className="text-center text-xs text-slate-400 mt-6">
                    {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta todavía?'}{' '}
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="text-amber-400 hover:underline font-medium ml-1 cursor-pointer"
                    >
                        {isRegistering ? 'Inicia sesión' : 'Regístrate aquí'}
                    </button>
                </p>
            </div>
        </div>
    );
};