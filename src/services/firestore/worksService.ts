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
import { mapPosition } from '../../utils/coordinates';

const WORKS_COLLECTION = 'works';

export interface CreateWorkInput {
    userId: string;
    name: string;
    client: string;
    description: string;
    address: string;
    locality?: string;
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
                const position = mapPosition(data.latitude, data.longitude);
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    name: data.name,
                    client: data.client || '',
                    description: data.description || '',
                    address: data.address || '',
                    locality: data.locality || '',
                    latitude: position?.[0] ?? null,
                    longitude: position?.[1] ?? null,
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
    const position = mapPosition(input.latitude, input.longitude);
    if (!position) throw new Error('Marcá la ubicación de la obra en el mapa.');
    const docRef = await addDoc(collection(db, WORKS_COLLECTION), {
        ...input,
        name: input.name.trim(),
        client: input.client.trim(),
        description: input.description.trim(),
        address: input.address.trim(),
        locality: input.locality?.trim() ?? '',
        latitude: position[0],
        longitude: position[1],
        agreedBudget: Number(input.agreedBudget) || 0,
        collectedAmount: Number(input.collectedAmount) || 0,
        estimatedCosts: Number(input.estimatedCosts) || 0,
        estimatedEndDate: input.estimatedEndDate ?? '',
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
