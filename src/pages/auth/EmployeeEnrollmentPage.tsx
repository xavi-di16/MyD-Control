import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { linkEmployeeProfile, readEmployeeInvitation } from '../../services/firestore/employeeProfilesService';

export const EmployeeEnrollmentPage = () => {
    const { user, logout } = useAuth();
    const { code = '' } = useParams();
    const navigate = useNavigate();
    const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof readEmployeeInvitation>>>();
    const [selected, setSelected] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let current = true;
        void readEmployeeInvitation(code).then((invite) => {
            if (current) setInvitation(invite);
        }).catch(() => {
            if (current) setInvitation(null);
        });
        return () => { current = false; };
    }, [code, user?.uid]);

    return (
        <main className="mx-auto mt-10 max-w-md rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
            <h1 className="text-xl font-bold">Vincular cuenta de empleado</h1>
            {user?.email && <p className="mt-1 text-sm text-[#525866]">{user.email}</p>}
            {invitation === undefined && <p role="status" className="mt-4 text-sm">Buscando invitación…</p>}
            {(invitation === null || (invitation?.claimedBy && invitation.claimedBy !== user?.uid)) &&
                <p role="alert" className="mt-4 text-sm text-red-700">La invitación venció, ya se usó o dejó de estar disponible. Pedile un enlace nuevo a Sergio.</p>}
            {invitation?.claimedBy && invitation.claimedBy === user?.uid && <Link className="mt-4 block font-bold" to="/tasks">Ir a Mis tareas</Link>}
            {invitation && !invitation.claimedBy && invitation.ownerId === user?.uid &&
                <p className="mt-4 text-sm">Abrí este enlace con la cuenta del empleado para vincularla.</p>}
            {user && invitation && !invitation.claimedBy && invitation.ownerId !== user.uid && (
                <form className="mt-5 space-y-3" onSubmit={(event) => {
                    event.preventDefault();
                    if (saving || selected !== invitation.employeeId) return;
                    setSaving(true);
                    setError('');
                    void linkEmployeeProfile(user.uid, code, invitation).then(() => navigate('/tasks', { replace: true }))
                        .catch(() => setError('No se pudo vincular la cuenta. Verificá que el empleado siga activo y que la invitación no se haya usado.'))
                        .finally(() => setSaving(false));
                }}>
                    <label className="grid gap-1 text-sm font-semibold"><span>Empleado</span>
                        <select required value={selected} onChange={(e) => setSelected(e.target.value)}
                            className="min-h-11 rounded-lg border border-[#E5E7EB] px-3">
                            <option value="">Seleccioná tu nombre</option>
                            <option value={invitation.employeeId}>{invitation.employeeName}</option>
                        </select>
                    </label>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <button disabled={!selected || saving} className="min-h-11 rounded-lg bg-[#F5C518] px-4 text-sm font-bold disabled:opacity-50">
                        {saving ? 'Vinculando…' : 'Vincular y abrir mis tareas'}
                    </button>
                </form>
            )}
            <button type="button" className="mt-4 text-sm font-semibold hover:underline" onClick={async () => {
                await logout();
                navigate('/employee-enrollment/' + code, { replace: true });
            }}>Usar otra cuenta</button>
        </main>
    );
};
