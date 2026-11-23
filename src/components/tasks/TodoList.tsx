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
    high: { label: 'Alta', classes: 'bg-red-50 text-red-700 border-red-200' },
    medium: { label: 'Media', classes: 'bg-amber-50 text-amber-800 border-amber-200' },
    low: { label: 'Baja', classes: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
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
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center shadow-2xs">
                <p className="text-sm font-medium text-[#717784]">
                    No hay tareas para mostrar con los filtros actuales.
                </p>
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
                        className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-2xs ${isCompleted
                                ? 'border-[#E5E7EB] bg-[#F5F6F8]/60 opacity-75'
                                : 'border-[#E5E7EB] hover:border-neutral-300'
                            }`}
                    >
                        <div className="flex items-start gap-3.5">
                            <input
                                type="checkbox"
                                aria-label={`Marcar ${task.title}`}
                                checked={isCompleted}
                                onChange={() => onToggle(task)}
                                className="mt-1 h-4 w-4 accent-[#171717] rounded cursor-pointer"
                            />
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3
                                        className={`text-sm font-bold ${isCompleted ? 'line-through text-[#717784]' : 'text-[#171717]'
                                            }`}
                                    >
                                        {task.title}
                                    </h3>
                                    <span
                                        className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${badge.classes}`}
                                    >
                                        Prioridad {badge.label}
                                    </span>
                                    {task.dueDate && (
                                        <span className="text-[11px] font-mono-num text-[#717784] bg-[#F5F6F8] border border-[#E5E7EB] px-2 py-0.5 rounded">
                                            Vence: {task.dueDate}
                                        </span>
                                    )}
                                </div>

                                {task.description && (
                                    <p className="text-xs text-[#717784] mt-1 leading-relaxed">
                                        {task.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-[#717784]">
                                    {task.workId && worksMap[task.workId] && (
                                        <span className="px-2 py-0.5 rounded bg-[#F5F6F8] border border-[#E5E7EB]">
                                            Obra: <strong className="text-[#171717]">{worksMap[task.workId]}</strong>
                                        </span>
                                    )}
                                    {task.employeeId && employeesMap[task.employeeId] && (
                                        <span className="px-2 py-0.5 rounded bg-[#F5F6F8] border border-[#E5E7EB]">
                                            Asignado: <strong className="text-[#171717]">{employeesMap[task.employeeId]}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                                type="button"
                                onClick={() => onEdit(task)}
                                className="px-3 py-1.5 bg-[#F5F6F8] hover:bg-neutral-200 text-[#171717] border border-[#E5E7EB] rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(task.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition cursor-pointer"
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