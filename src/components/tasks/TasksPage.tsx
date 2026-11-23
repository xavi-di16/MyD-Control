// src/pages/tasks/TasksPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { TodoForm, type TodoFormValues } from '../../components/tasks/TodoForm';
import { TodoList } from '../../components/tasks/TodoList';
import type { Task, TaskPriority, Work, Employee } from '../../types';
import { subscribeToWorks } from '../../services/firestore/worksService';
import { subscribeToEmployees } from '../../services/firestore/employeesService';
import { sendTasksSummaryEmail } from '../../services/email/emailService';

export const TasksPage: React.FC = () => {
    const { user } = useAuth();
    const { tasks, loading, error, addTask, editTask, toggleTaskStatus, removeTask } = useTasks();

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
    const [works, setWorks] = useState<Work[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsubWorks = subscribeToWorks(user.uid, setWorks, () => { });
        const unsubEmp = subscribeToEmployees(user.uid, setEmployees, () => { });
        return () => {
            unsubWorks();
            unsubEmp();
        };
    }, [user]);

    const handleFormSubmit = async (values: TodoFormValues) => {
        if (editingTask) {
            await editTask(editingTask.id, {
                title: values.title,
                description: values.description,
                priority: values.priority,
                dueDate: values.dueDate || undefined,
                workId: values.workId || undefined,
                employeeId: values.employeeId || undefined,
            });
            setEditingTask(null);
        } else {
            await addTask({
                title: values.title,
                description: values.description,
                priority: values.priority,
                dueDate: values.dueDate || undefined,
                workId: values.workId || undefined,
                employeeId: values.employeeId || undefined,
            });
        }
    };

    const handleSendSummary = async () => {
        if (!user?.email) return;
        setSendingEmail(true);
        setEmailFeedback(null);
        try {
            const response = await sendTasksSummaryEmail(
                user.email,
                user.displayName || user.email,
                tasks
            );
            setEmailFeedback(response.message);
        } catch (err) {
            setEmailFeedback(
                err instanceof Error ? err.message : 'Error al enviar el resumen por correo.'
            );
        } finally {
            setSendingEmail(false);
        }
    };

    const filteredTasks = tasks.filter((task) => {
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'completed' ? task.status === 'completed' : task.status !== 'completed');
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesStatus && matchesPriority;
    });

    const worksMap: Record<string, string> = {};
    works.forEach((w) => {
        worksMap[w.id] = w.name;
    });

    const employeesMap: Record<string, string> = {};
    employees.forEach((emp) => {
        employeesMap[emp.id] = emp.name;
    });

    return (
        <div className="space-y-6">
            {/* Encabezado de página */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
                        Gestor Estratégico de Tareas
                    </h1>
                    <p className="text-xs text-[#717784] mt-0.5">
                        Planificación operativa vinculada a obras y personal con sincronización en tiempo real
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSendSummary}
                    disabled={sendingEmail || tasks.length === 0}
                    className="px-4 py-2.5 bg-[#171717] hover:bg-[#252525] disabled:opacity-50 text-[#F5C518] font-bold rounded-lg text-xs transition cursor-pointer shrink-0"
                >
                    {sendingEmail ? 'Enviando resumen...' : 'Enviar Resumen por Email (AWS SES)'}
                </button>
            </div>

            {emailFeedback && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                    {emailFeedback}
                </div>
            )}

            {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {error}
                </div>
            )}

            {/* Formulario de Creación / Edición */}
            <TodoForm
                onSubmit={handleFormSubmit}
                editingTask={editingTask}
                onCancelEdit={() => setEditingTask(null)}
                worksOptions={works.map((w) => ({ id: w.id, name: w.name }))}
                employeesOptions={employees.map((e) => ({ id: e.id, name: e.name }))}
            />

            {/* Barra de Filtros y Contadores */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {(['all', 'pending', 'completed'] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === st
                                    ? 'bg-[#171717] text-[#F5C518]'
                                    : 'bg-[#F5F6F8] text-[#717784] hover:text-[#171717] border border-[#E5E7EB]'
                                }`}
                        >
                            {st === 'all'
                                ? `Todas (${tasks.length})`
                                : st === 'pending'
                                    ? `Pendientes (${tasks.filter((t) => t.status !== 'completed').length})`
                                    : `Completadas (${tasks.filter((t) => t.status === 'completed').length})`}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#717784]">Prioridad:</span>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
                        className="px-3 py-1.5 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#171717]"
                    >
                        <option value="all">Todas</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                    </select>
                </div>
            </div>

            {/* Listado de Tareas */}
            {loading ? (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#717784]">
                    Cargando tareas operativas...
                </div>
            ) : (
                <TodoList
                    tasks={filteredTasks}
                    onToggle={toggleTaskStatus}
                    onEdit={(task) => setEditingTask(task)}
                    onDelete={removeTask}
                    worksMap={worksMap}
                    employeesMap={employeesMap}
                />
            )}
        </div>
    );
};

export default TasksPage;