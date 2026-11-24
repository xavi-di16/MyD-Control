// src/services/firestore/financeService.ts
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { Movement, MovementType, AccountType, BudgetItem } from '../../types';

const MOVEMENTS_COLLECTION = 'movements';
const BUDGETS_COLLECTION = 'budgets';

export interface CreateMovementInput {
    userId: string;
    workId?: string;
    employeeId?: string;
    type: MovementType;
    account: AccountType;
    category: string;
    description: string;
    amount: number;
    date: string;
}

export const subscribeToMovements = (
    userId: string,
    onData: (movements: Movement[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(collection(db, MOVEMENTS_COLLECTION), where('userId', '==', userId));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: Movement[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    workId: data.workId || undefined,
                    employeeId: data.employeeId || undefined,
                    type: (data.type as MovementType) || 'expense',
                    account: (data.account as AccountType) || 'myd',
                    category: data.category || 'General',
                    description: data.description || '',
                    amount: Number(data.amount) || 0,
                    date: data.date || new Date().toISOString().slice(0, 10),
                    createdAt: data.createdAt || new Date().toISOString(),
                    source: data.source === 'payroll' ? 'payroll' : undefined,
                };
            });
            items.sort((a, b) => b.date.localeCompare(a.date));
            onData(items);
        },
        onError
    );
};

export const createMovement = async (input: CreateMovementInput): Promise<string> => {
    const docRef = await addDoc(collection(db, MOVEMENTS_COLLECTION), {
        userId: input.userId,
        workId: input.workId || '',
        employeeId: input.employeeId || '',
        type: input.type,
        account: input.account,
        category: input.category.trim() || 'General',
        description: input.description.trim(),
        amount: Math.round((Number(input.amount) || 0) * 100) / 100,
        date: input.date,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
};

export const deleteMovement = async (movementId: string): Promise<void> => {
    await deleteDoc(doc(db, MOVEMENTS_COLLECTION, movementId));
};

export interface CreateBudgetItemInput {
    userId: string;
    workId: string;
    type: 'material' | 'labor' | 'other';
    description: string;
    quantity: number;
    unitEstimatedCost: number;
    unitActualCost: number;
}

export const subscribeToBudgets = (
    userId: string,
    onData: (items: BudgetItem[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(collection(db, BUDGETS_COLLECTION), where('userId', '==', userId));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: BudgetItem[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    workId: data.workId,
                    type: (data.type as 'material' | 'labor' | 'other') || 'material',
                    description: data.description || '',
                    quantity: Number(data.quantity) || 1,
                    unitEstimatedCost: Number(data.unitEstimatedCost) || 0,
                    unitActualCost: Number(data.unitActualCost) || 0,
                    createdAt: data.createdAt || new Date().toISOString(),
                };
            });
            items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            onData(items);
        },
        onError
    );
};

export const createBudgetItem = async (input: CreateBudgetItemInput): Promise<string> => {
    const docRef = await addDoc(collection(db, BUDGETS_COLLECTION), {
        userId: input.userId,
        workId: input.workId,
        type: input.type,
        description: input.description.trim(),
        quantity: Number(input.quantity) || 1,
        unitEstimatedCost: Number(input.unitEstimatedCost) || 0,
        unitActualCost: Number(input.unitActualCost) || 0,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
};

export const deleteBudgetItem = async (budgetId: string): Promise<void> => {
    await deleteDoc(doc(db, BUDGETS_COLLECTION, budgetId));
};
