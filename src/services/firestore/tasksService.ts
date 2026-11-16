// src/services/firestore/tasksService.ts
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { Task, TaskPriority, TaskStatus } from '../../types';

const TASKS_COLLECTION = 'tasks';

export interface CreateTaskInput {
    userId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status?: TaskStatus;
    dueDate?: string;
    workId?: string;
    employeeId?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string;
    workId?: string;
    employeeId?: string;
}

export const subscribeToUserTasks = (
    userId: string,
    onData: (tasks: Task[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: Task[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    title: data.title,
                    description: data.description || '',
                    status: data.status || 'pending',
                    priority: data.priority || 'medium',
                    dueDate: data.dueDate || undefined,
                    workId: data.workId || undefined,
                    employeeId: data.employeeId || undefined,
                    createdAt: data.createdAt || new Date().toISOString(),
                };
            });

            items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            onData(items);
        },
        (err) => {
            onError(err);
        }
    );
};

export const createTask = async (input: CreateTaskInput): Promise<string> => {
    const payload = {
        userId: input.userId,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        status: input.status || 'pending',
        dueDate: input.dueDate || '',
        workId: input.workId || '',
        employeeId: input.employeeId || '',
        createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), payload);
    return docRef.id;
};

export const updateTask = async (taskId: string, updates: UpdateTaskInput): Promise<void> => {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, { ...updates });
};

export const toggleTaskCompletion = async (task: Task): Promise<void> => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status: nextStatus });
};

export const deleteTask = async (taskId: string): Promise<void> => {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);
};