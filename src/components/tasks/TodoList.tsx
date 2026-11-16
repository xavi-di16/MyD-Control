// src/components/tasks/TodoList.tsx
import React from 'react';
import type { Task } from '../../types';

interface TodoListProps {
    tasks: Task[];
    onToggle: (task: Task) => Promise<void>;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => Promise<void>;
    worksMap?: Record<string, string>;
    employeesMap?: Record<string, string>;
}

const priorityBadge: Record<Task['priority'], { label: string; classes: string }> = {
    high: { label: 'Alta', classes: 'bg-red-500/15 text-red-300 border-red-500/30' },
    medium: { label: 'Media', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    low: { label: 'Baja', classes: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
};

export const TodoList: React.FC<TodoListProps> = ({
    tasks,
    onToggle,
    onEdit,
    onDelete,
    worksMap = {},
    employeesMap = {},
}) => {
    if (tasks.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-sm text-slate-400">No hay tareas para mostrar con los filtros actuales.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tasks.map((task) => {
                const badge = priorityBadge[task.priority];
                const isCompleted = task.status === 'completed';

                return (
                    <div
                        key={task.id}
                        className={`bg-slate-900 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${isCompleted ? 'border-slate-800/60 opacity-70' : 'border-slate-800'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                aria-label={`Marcar ${task.title}`}
                                checked={isCompleted}
                                onChange={() => onToggle(task)}
                                className="mt-1 h-4 w-4 accent-amber-500 rounded cursor-pointer"
                            />
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3
                                        className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-white'
                                            }`}
                                    >
                                        {task.title}
                                    </h3>
                                    <span
                                        className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badge.classes}`}
                                    >
                                        Prioridad {badge.label}
                                    </span>
                                    {task.dueDate && (
                                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                            Vence: {task.dueDate}
                                        </span>
                                    )}
                                </div>

                                {task.description && (
                                    <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                                )}

                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                                    {task.workId && worksMap[task.workId] && (
                                        <span>Obra: <strong className="text-slate-200">{worksMap[task.workId]}</strong></span>
                                    )}
                                    {task.employeeId && employeesMap[task.employeeId] && (
                                        <span>Asignado: <strong className="text-slate-200">{employeesMap[task.employeeId]}</strong></span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                                type="button"
                                onClick={() => onEdit(task)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(task.id)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};