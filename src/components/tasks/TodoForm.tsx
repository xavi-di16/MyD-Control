// src/components/tasks/TodoForm.tsx
import React, { useState, useEffect } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../../types';

export interface TodoFormValues {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string;
    workId: string;
    employeeId: string;
    status?: TaskStatus;
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
    const [status, setStatus] = useState<TaskStatus>('pending');
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
            setStatus(editingTask.status);
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
                ...(editingTask && { status }),
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
            className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-2xs space-y-4"
            noValidate
        >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-4 rounded-xs bg-[#F5C518]" />
                    <h2 className="text-base font-bold text-[#171717]">
                        {editingTask ? 'Editar Tarea Operativa' : 'Nueva Tarea Operativa'}
                    </h2>
                </div>
                {editingTask && onCancelEdit && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="text-xs font-semibold text-[#717784] hover:text-[#171717] px-2.5 py-1 rounded-md bg-[#F5F6F8] border border-[#E5E7EB] cursor-pointer"
                    >
                        Cancelar edición
                    </button>
                )}
            </div>

            {validationError && (
                <div
                    role="alert"
                    className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
                >
                    {validationError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label htmlFor="task-title" className="block text-xs font-semibold text-[#171717] mb-1.5">
                        Título de la tarea *
                    </label>
                    <input
                        id="task-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej. Comprar materiales eléctricos para obra centro"
                        className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm focus:outline-none focus:border-[#171717] focus:ring-2 focus:ring-[#F5C518]/40 transition"
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="task-desc" className="block text-xs font-semibold text-[#171717] mb-1.5">
                        Descripción / Detalles técnicos
                    </label>
                    <textarea
                        id="task-desc"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Especificaciones, medidas o instrucciones para el personal..."
                        className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm focus:outline-none focus:border-[#171717] focus:ring-2 focus:ring-[#F5C518]/40 transition"
                    />
                </div>

                <div>
                    <label htmlFor="task-priority" className="block text-xs font-semibold text-[#171717] mb-1.5">
                        Nivel de Prioridad
                    </label>
                    <select
                        id="task-priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm focus:outline-none focus:border-[#171717]"
                    >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="task-due" className="block text-xs font-semibold text-[#171717] mb-1.5">
                        Fecha de vencimiento
                    </label>
                    <input
                        id="task-due"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm focus:outline-none focus:border-[#171717]"
                    />
                </div>

                {editingTask && (
                    <label className="grid gap-1 text-xs font-semibold">Estado de la tarea
                        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className="rounded-lg border border-[#E5E7EB] bg-[#F5F6F8] px-3.5 py-2 text-sm">
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En curso</option>
                            <option value="completed">Completada</option>
                        </select>
                    </label>
                )}

                {(worksOptions.length > 0 || !!workId) && (
                    <div>
                        <label htmlFor="task-work" className="block text-xs font-semibold text-[#171717] mb-1.5">
                            Obra asociada
                        </label>
                        <select
                            id="task-work"
                            value={workId}
                            onChange={(e) => setWorkId(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm focus:outline-none focus:border-[#171717]"
                        >
                            <option value="">Sin obra específica</option>
                            {workId && !worksOptions.some((work) => work.id === workId) && <option value={workId}>Obra archivada</option>}
                            {worksOptions.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {(employeesOptions.length > 0 || !!employeeId) && (
                    <div>
                        <label htmlFor="task-employee" className="block text-xs font-semibold text-[#171717] mb-1.5">
                            Empleado asignado
                        </label>
                        <select
                            id="task-employee"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#F5F6F8] focus:bg-white border border-[#E5E7EB] rounded-lg text-[#171717] text-sm focus:outline-none focus:border-[#171717]"
                        >
                            <option value="">Sin asignar</option>
                            {employeeId && !employeesOptions.some((employee) => employee.id === employeeId) && <option value={employeeId}>Empleado archivado</option>}
                            {employeesOptions.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-[#F5C518] hover:bg-[#E0AD00] disabled:opacity-50 text-[#171717] font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
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
