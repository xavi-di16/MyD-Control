// src/components/tasks/__tests__/TodoForm.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodoForm } from '../TodoForm';

describe('TodoForm Component', () => {
    it('muestra error de validación cuando se intenta enviar el título vacío (caso borde)', async () => {
        const mockSubmit = vi.fn().mockResolvedValue(undefined);

        render(<TodoForm onSubmit={mockSubmit} />);

        const submitBtn = screen.getByRole('button', { name: /agregar tarea/i });
        fireEvent.click(submitBtn);

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('El título de la tarea es obligatorio.');
        expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('envía correctamente los datos del formulario y limpia los campos tras crear la tarea', async () => {
        const mockSubmit = vi.fn().mockResolvedValue(undefined);

        render(<TodoForm onSubmit={mockSubmit} />);

        const titleInput = screen.getByLabelText(/título de la tarea/i) as HTMLInputElement;
        const descInput = screen.getByLabelText(/descripción/i) as HTMLTextAreaElement;
        const prioritySelect = screen.getByLabelText(/prioridad/i) as HTMLSelectElement;
        const submitBtn = screen.getByRole('button', { name: /agregar tarea/i });

        fireEvent.change(titleInput, { target: { value: 'Revisar tablero eléctrico' } });
        fireEvent.change(descInput, { target: { value: 'Verificar térmicas y disyuntor' } });
        fireEvent.change(prioritySelect, { target: { value: 'high' } });

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledTimes(1);
            expect(mockSubmit).toHaveBeenCalledWith({
                title: 'Revisar tablero eléctrico',
                description: 'Verificar térmicas y disyuntor',
                priority: 'high',
                dueDate: '',
                workId: '',
                employeeId: '',
            });
        });

        expect(titleInput.value).toBe('');
    });
});