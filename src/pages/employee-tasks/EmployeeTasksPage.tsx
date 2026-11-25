import { useEffect, useState } from 'react';
import { TodoForm, type TodoFormValues } from '../../components/tasks/TodoForm';
import { TodoList } from '../../components/tasks/TodoList';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import type { EmployeeProfile } from '../../services/firestore/employeeProfilesService';
import { subscribeToAssignedTasks, updateTask } from '../../services/firestore/tasksService';
import type { Task, TaskStatus } from '../../types';
import { displayDate } from '../../utils/attendance';

export const EmployeeTasksPage = ({ profile }: { profile: EmployeeProfile }) => {
    const { logout } = useAuth();
    const { tasks, loading, error, addTask, editTask, toggleStatus, removeTask } = useTasks();
    const [assigned, setAssigned] = useState<Task[]>();
    const [assignedError, setAssignedError] = useState('');
    const [editing, setEditing] = useState<Task | null>(null);
    const [saving, setSaving] = useState('');

    useEffect(() => subscribeToAssignedTasks(profile.ownerId, profile.employeeId, setAssigned,
        () => setAssignedError('Las tareas asignadas no están disponibles. Consultá con Sergio si tu ficha sigue activa.')),
    [profile.ownerId, profile.employeeId]);

    const savePersonal = async (values: TodoFormValues) => {
        const { title, description, dueDate, priority, status } = values;
        if (editing) {
            await editTask(editing.id, { title, description, dueDate, priority, status: status ?? editing.status });
            setEditing(null);
        } else await addTask({ title, description, dueDate, priority });
    };

    const changeStatus = async (task: Task, status: TaskStatus) => {
        setSaving(task.id);
        setAssignedError('');
        try {
            await updateTask(task.id, { status });
        } catch {
            setAssignedError('No se pudo actualizar la tarea asignada.');
        } finally {
            setSaving('');
        }
    };

    return (
        <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#171717] p-5 text-white">
                <div><h1 className="text-2xl font-bold">Mis tareas</h1><p className="text-sm text-[#F5C518]">{profile.employeeName}</p></div>
                <button type="button" className="min-h-11 rounded-lg border border-white/40 px-3 text-sm font-bold" onClick={() => void logout()}>
                    Cerrar sesión
                </button>
            </header>
            <section className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6" aria-labelledby="assigned-heading">
                <h2 id="assigned-heading" className="text-lg font-bold">Asignadas por Sergio</h2>
                {assignedError && <p role="alert" className="text-sm text-red-700">{assignedError}</p>}
                {!assigned && !assignedError && <p role="status" className="text-sm">Cargando tareas asignadas…</p>}
                {assigned?.length === 0 && <p className="text-sm text-[#525866]">Todavía no tenés tareas asignadas.</p>}
                <ul className="divide-y divide-[#E5E7EB]">
                    {assigned?.map((task) => <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                            <p className="break-words font-bold">{task.title}</p>
                            {task.description && <p className="whitespace-pre-wrap break-words text-sm">{task.description}</p>}
                            {task.dueDate && <p className="text-xs text-[#525866]">Vence el {displayDate(task.dueDate)}</p>}
                        </div>
                        <select aria-label={'Estado de ' + task.title} className="min-h-11 rounded-lg border border-[#E5E7EB] bg-white px-2 text-sm"
                            value={task.status} disabled={!!saving} onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)}>
                            <option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="completed">Completada</option>
                        </select>
                    </li>)}
                </ul>
            </section>
            <section className="space-y-3" aria-labelledby="personal-heading">
                <h2 id="personal-heading" className="text-lg font-bold">Tareas personales</h2>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <TodoForm editingTask={editing} onCancelEdit={() => setEditing(null)} onSubmit={savePersonal} />
                {loading ? <p role="status">Cargando tus tareas…</p> :
                    <TodoList tasks={tasks} onToggle={toggleStatus} onEdit={setEditing} onDelete={removeTask} />}
            </section>
        </main>
    );
};
