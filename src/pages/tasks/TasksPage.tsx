// src/pages/tasks/TasksPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { TodoForm, type TodoFormValues } from '../../components/tasks/TodoForm';
import { TodoList } from '../../components/tasks/TodoList';
import { sendTasksSummaryEmail } from '../../services/email/emailService';
import type { Task, TaskPriority, TaskStatus } from '../../types';

export const TasksPage: React.FC = () => {
    const { user } = useAuth();
    const {
        tasks,
        loading,
        error,
        addTask,
        editTask,
        toggleStatus,
        removeTask,
        getFilteredTasks,
    } = useTasks();

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

    const [emailLoading, setEmailLoading] = useState(false);
    const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
        null
    );

    const filteredTasks = getFilteredTasks(statusFilter, priorityFilter);

    const handleFormSubmit = async (values: TodoFormValues) => {
        if (editingTask) {
            await editTask(editingTask.id, {
                title: values.title,
                description: values.description,
                priority: values.priority,
                dueDate: values.dueDate,
                workId: values.workId,
                employeeId: values.employeeId,
            });
            setEditingTask(null);
        } else {
            await addTask(values);
        }
    };

    const handleSendEmailSummary = async () => {
        if (!user?.email) return;
        setEmailLoading(true);
        setEmailStatus(null);
        try {
            const res = await sendTasksSummaryEmail(
                user.email,
                user.displayName || user.email,
                tasks
            );
            setEmailStatus({ type: 'success', text: res.message });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error al enviar el resumen por email.';
            setEmailStatus({ type: 'error', text: msg });
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gestor Estratégico de Tareas</h1>
                    <p className="text-sm text-slate-400">
                        Sincronización en tiempo real con Cloud Firestore y notificación vía AWS SES
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSendEmailSummary}
                    disabled={emailLoading}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs transition cursor-pointer self-start sm:self-auto"
                >
                    {emailLoading ? 'Enviando resumen...' : 'Enviar Resumen por Email (AWS SES)'}
                </button>
            </div>

            {emailStatus && (
                <div
                    role="status"
                    className={`p-3 rounded-lg border text-xs ${emailStatus.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}
                >
                    {emailStatus.text}
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs"
                >
                    {error}
                </div>
            )}

            <TodoForm
                onSubmit={handleFormSubmit}
                editingTask={editingTask}
                onCancelEdit={() => setEditingTask(null)}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Estado:</span>
                    {(['all', 'pending', 'completed'] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${statusFilter === st
                                ? 'bg-amber-500 text-slate-950 font-semibold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            {st === 'all' ? 'Todas' : st === 'pending' ? 'Pendientes' : 'Completadas'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="filter-priority" className="text-xs text-slate-400 font-medium">
                        Prioridad:
                    </label>
                    <select
                        id="filter-priority"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
                        className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                        <option value="all">Todas</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">
                    Cargando tareas en tiempo real...
                </div>
            ) : (
                <TodoList
                    tasks={filteredTasks}
                    onToggle={toggleStatus}
                    onEdit={(task) => setEditingTask(task)}
                    onDelete={removeTask}
                />
            )}
        </div>
    );
};

export default TasksPage;