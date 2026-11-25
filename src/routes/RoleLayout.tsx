import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeTasksPage } from '../pages/employee-tasks/EmployeeTasksPage';
import { watchEmployeeProfile, type EmployeeProfile } from '../services/firestore/employeeProfilesService';

export const RoleLayout = () => {
    const { user } = useAuth();
    return user && <AccountLayout key={user.uid} uid={user.uid} />;
};

const AccountLayout = ({ uid }: { uid: string }) => {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const [profile, setProfile] = useState<EmployeeProfile | null>();
    const [error, setError] = useState(false);

    useEffect(() => watchEmployeeProfile(uid, setProfile, () => setError(true)), [uid]);

    if (error) return <main className="mx-auto max-w-lg p-6">
        <p role="alert">No se pudo comprobar el perfil. Verificá la conexión y las reglas de Firestore.</p>
        <button type="button" className="mt-4 font-bold" onClick={() => void logout()}>Cerrar sesión</button>
    </main>;
    if (profile === undefined) return <p role="status" className="p-6">Verificando perfil…</p>;
    if (!profile) return <MainLayout />;
    if (pathname !== '/tasks') return <Navigate to="/tasks" replace />;
    return <EmployeeTasksPage profile={profile} />;
};
