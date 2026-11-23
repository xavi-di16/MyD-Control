// src/routes/RequireAuth.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RequireAuthProps {
    children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center p-6">
                <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-[#171717] text-[#F5C518] font-extrabold text-lg flex items-center justify-center mx-auto shadow-sm">
                        MYD
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-ping" />
                        <span className="text-sm font-semibold text-[#171717]">
                            Verificando credenciales...
                        </span>
                    </div>
                    <p className="text-xs text-[#717784]">
                        Sincronizando sesión segura con MYD Control
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default RequireAuth;