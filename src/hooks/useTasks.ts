// src/hooks/useTasks.ts
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskPriority, TaskStatus } from '../types';
import {
    subscribeToUserTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    type UpdateTaskInput,
} from '../services/firestore/tasksService';

export const useTasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToUserTasks(
            user.uid,
            (data) => {
                setTasks(data);
                setLoading(false);
            },
            (err) => {
                setError(err.message || 'Error al sincronizar las tareas con Firestore.');
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [user]);

    const addTask = useCallback(
        async (input: {
            title: string;
            description: string;
            priority: TaskPriority;
            dueDate?: string;
            workId?: string;
            employeeId?: string;
        }) => {
            if (!user) throw new Error('Usuario no autenticado.');
            setError(null);
            try {
                await createTask({
                    userId: user.uid,
                    ...input,
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'No se pudo crear la tarea.';
                setError(msg);
                throw err;
            }
        },
        [user]
    );

    const editTask = useCallback(async (taskId: string, updates: UpdateTaskInput) => {
        setError(null);
        try {
            await updateTask(taskId, updates);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'No se pudo actualizar la tarea.';
            setError(msg);
            throw err;
        }
    }, []);

    const toggleStatus = useCallback(async (task: Task) => {
        setError(null);
        try {
            await toggleTaskCompletion(task);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'No se pudo cambiar el estado de la tarea.';
            setError(msg);
            throw err;
        }
    }, []);

    const removeTask = useCallback(async (taskId: string) => {
        setError(null);
        try {
            await deleteTask(taskId);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'No se pudo eliminar la tarea.';
            setError(msg);
            throw err;
        }
    }, []);

    const getFilteredTasks = useCallback(
        (statusFilter: 'all' | TaskStatus, priorityFilter: 'all' | TaskPriority) => {
            return tasks.filter((task) => {
                const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
                const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
                return matchesStatus && matchesPriority;
            });
        },
        [tasks]
    );

    return {
        tasks,
        loading,
        error,
        addTask,
        editTask,
        toggleStatus,
        toggleTaskStatus: toggleStatus,
        removeTask,
        getFilteredTasks,
    };
};