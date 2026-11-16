// src/services/firestore/worksService.ts
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
import type { Work, WorkStatus } from '../../types';

const WORKS_COLLECTION = 'works';

export interface CreateWorkInput {
    userId: string;
    name: string;
    client: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    agreedBudget: number;
    collectedAmount: number;
    estimatedCosts: number;
    status: WorkStatus;
    startDate: string;
    estimatedEndDate?: string;
}

export const subscribeToWorks = (
    userId: string,
    onData: (works: Work[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(collection(db, WORKS_COLLECTION), where('userId', '==', userId));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: Work[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    name: data.name,
                    client: data.client || '',
                    description: data.description || '',
                    address: data.address || '',
                    latitude: Number(data.latitude) || -31.4201,
                    longitude: Number(data.longitude) || -64.1888,
                    agreedBudget: Number(data.agreedBudget) || 0,
                    collectedAmount: Number(data.collectedAmount) || 0,
                    estimatedCosts: Number(data.estimatedCosts) || 0,
                    status: (data.status as WorkStatus) || 'active',
                    startDate: data.startDate || new Date().toISOString().slice(0, 10),
                    estimatedEndDate: data.estimatedEndDate || undefined,
                    createdAt: data.createdAt || new Date().toISOString(),
                };
            });
            items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            onData(items);
        },
        onError
    );
};

export const createWork = async (input: CreateWorkInput): Promise<string> => {
    const docRef = await addDoc(collection(db, WORKS_COLLECTION), {
        ...input,
        name: input.name.trim(),
        client: input.client.trim(),
        description: input.description.trim(),
        address: input.address.trim(),
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        agreedBudget: Number(input.agreedBudget) || 0,
        collectedAmount: Number(input.collectedAmount) || 0,
        estimatedCosts: Number(input.estimatedCosts) || 0,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
};

export const updateWork = async (
    workId: string,
    updates: Partial<Omit<Work, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
    await updateDoc(doc(db, WORKS_COLLECTION, workId), updates);
};

export const deleteWork = async (workId: string): Promise<void> => {
    await deleteDoc(doc(db, WORKS_COLLECTION, workId));
};