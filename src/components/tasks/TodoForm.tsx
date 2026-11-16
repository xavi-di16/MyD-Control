// src/components/tasks/TodoForm.tsx
import React, { useState, useEffect } from 'react';
import type { Task, TaskPriority } from '../../types';

export interface TodoFormValues {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string;
    workId: string;
    employeeId: string;
}

interface TodoFormProps {
    onSubmit: (values: TodoFormValues) => Promise<void>;
    editingTask?: Task | null;
    onCancelEdit?: () => void;
    worksOptions?: Array<{ id: string; name: string }>;
    employeesOptions?: Array<{ id: string; name: string }>;
}

export const TodoForm: React.FC<TodoFormProps> = ({
    onSubmit,
    editingTask = null,
    onCancelEdit,
    worksOptions = [],
    employeesOptions = [],
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState('');
    const [workId, setWorkId] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (editingTask) {
            setTitle(editingTask.title);
            setDescription(editingTask.description);
            setPriority(editingTask.priority);
            setDueDate(editingTask.dueDate || '');
            setWorkId(editingTask.workId || '');
            setEmployeeId(editingTask.employeeId || '');
            setValidationError(null);
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setDueDate('');
            setWorkId('');
            setEmployeeId('');
        }
    }, [editingTask]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidationError(null);

        if (!title.trim()) {
            setValidationError('El título de la tarea es obligatorio.');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim(),
                priority,
                dueDate,
                workId,
                employeeId,
            });

            if (!editingTask) {
                setTitle('');
                setDescription('');
                setPriority('medium');
                setDueDate('');
                setWorkId('');
                setEmployeeId('');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            noValidate
        >
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                    {editingTask ? 'Editar Tarea' : 'Nueva Tarea Operativa'}
                </h2>
                {editingTask && onCancelEdit && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                        Cancelar edición
                    </button>
                )}
            </div>

            {validationError && (
                <div
                    role="alert"
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs"
                >
                    {validationError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label htmlFor="task-title" className="block text-xs font-medium text-slate-300 mb-1">
                        Título de la tarea *
                    </label>
                    <input
                        id="task-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej. Comprar materiales eléctricos para obra centro"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="task-desc" className="block text-xs font-medium text-slate-300 mb-1">
                        Descripción / Detalles
                    </label>
                    <textarea
                        id="task-desc"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Especificaciones, medidas o instrucciones para el personal..."
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                </div>

                <div>
                    <label htmlFor="task-priority" className="block text-xs font-medium text-slate-300 mb-1">
                        Prioridad
                    </label>
                    <select
                        id="task-priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="task-due" className="block text-xs font-medium text-slate-300 mb-1">
                        Fecha de vencimiento
                    </label>
                    <input
                        id="task-due"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                </div>

                {worksOptions.length > 0 && (
                    <div>
                        <label htmlFor="task-work" className="block text-xs font-medium text-slate-300 mb-1">
                            Obra asociada
                        </label>
                        <select
                            id="task-work"
                            value={workId}
                            onChange={(e) => setWorkId(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                        >
                            <option value="">Sin obra específica</option>
                            {worksOptions.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {employeesOptions.length > 0 && (
                    <div>
                        <label htmlFor="task-employee" className="block text-xs font-medium text-slate-300 mb-1">
                            Empleado asignado
                        </label>
                        <select
                            id="task-employee"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                        >
                            <option value="">Sin asignar</option>
                            {employeesOptions.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-sm transition cursor-pointer"
                >
                    {submitting
                        ? 'Guardando...'
                        : editingTask
                            ? 'Guardar Cambios'
                            : 'Agregar Tarea'}
                </button>
            </div>
        </form>
    );
};