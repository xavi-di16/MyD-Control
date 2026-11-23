// src/components/tasks/__tests__/TodoList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoList } from '../TodoList';
import type { Task } from '../../../types';

const sampleTasks: Task[] = [
    {
        id: 'task-1',
        userId: 'user-123',
        title: 'Comprar bolsas de cemento',
        description: '15 bolsas para obra centro',
        status: 'pending',
        priority: 'high',
        dueDate: '2026-11-20',
        workId: 'work-1',
        employeeId: 'emp-1',
        createdAt: '2026-11-14T10:00:00.000Z',
    },
];

describe('TodoList Component', () => {
    it('muestra mensaje informativo cuando la lista de tareas está vacía', () => {
        render(
            <TodoList
                tasks={[]}
                onToggle={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        expect(
            screen.getByText(/no hay tareas para mostrar con los filtros actuales/i)
        ).toBeInTheDocument();
    });

    it('renderiza las tareas y ejecuta callbacks de completar, editar y eliminar', () => {
        const mockToggle = vi.fn().mockResolvedValue(undefined);
        const mockEdit = vi.fn();
        const mockDelete = vi.fn().mockResolvedValue(undefined);

        render(
            <TodoList
                tasks={sampleTasks}
                onToggle={mockToggle}
                onEdit={mockEdit}
                onDelete={mockDelete}
                worksMap={{ 'work-1': 'Obra Centro' }}
                employeesMap={{ 'emp-1': 'Esteban' }}
            />
        );

        expect(screen.getByText('Comprar bolsas de cemento')).toBeInTheDocument();
        expect(screen.getByText('Obra Centro')).toBeInTheDocument();
        expect(screen.getByText('Esteban')).toBeInTheDocument();

        const checkbox = screen.getByRole('checkbox', {
            name: /marcar comprar bolsas de cemento/i,
        });
        fireEvent.click(checkbox);
        expect(mockToggle).toHaveBeenCalledWith(sampleTasks[0]);

        const editBtn = screen.getByRole('button', { name: /editar/i });
        fireEvent.click(editBtn);
        expect(mockEdit).toHaveBeenCalledWith(sampleTasks[0]);

        const deleteBtn = screen.getByRole('button', { name: /eliminar/i });
        fireEvent.click(deleteBtn);
        expect(mockDelete).toHaveBeenCalledWith('task-1');
    });
});