// src/services/firestore/employeesService.ts
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
import type { Employee, PayrollRecord } from '../../types';
import { calculatePayroll } from '../../utils/calculations';
import { journalsAsPayrolls } from '../../utils/attendance';
import { subscribeToJournals } from './attendanceService';

const EMPLOYEES_COLLECTION = 'employees';
const PAYROLLS_COLLECTION = 'payrolls';

export const subscribeToEmployees = (
    userId: string,
    onData: (employees: Employee[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(collection(db, EMPLOYEES_COLLECTION), where('userId', '==', userId));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: Employee[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    name: data.name,
                    role: data.role || 'Operario',
                    dailyRate: Number(data.dailyRate) || 0,
                    active: data.active ?? true,
                    isOwner: data.isOwner ?? false,
                    createdAt: data.createdAt || new Date().toISOString(),
                };
            });
            items.sort((a, b) => a.name.localeCompare(b.name));
            onData(items);
        },
        onError
    );
};

export const createEmployee = async (input: {
    userId: string;
    name: string;
    role: string;
    dailyRate: number;
    active?: boolean;
    isOwner?: boolean;
}): Promise<string> => {
    const docRef = await addDoc(collection(db, EMPLOYEES_COLLECTION), {
        userId: input.userId,
        name: input.name.trim(),
        role: input.role.trim() || 'Operario',
        dailyRate: Number(input.dailyRate) || 0,
        active: input.active ?? true,
        isOwner: input.isOwner ?? false,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
};

export const updateEmployee = async (
    employeeId: string,
    updates: Partial<Pick<Employee, 'name' | 'role' | 'dailyRate' | 'active' | 'isOwner'>>
): Promise<void> => {
    await updateDoc(doc(db, EMPLOYEES_COLLECTION, employeeId), updates);
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, employeeId));
};

export const subscribeToLegacyPayrolls = (
    userId: string,
    onData: (records: PayrollRecord[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(collection(db, PAYROLLS_COLLECTION), where('userId', '==', userId));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: PayrollRecord[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    employeeId: data.employeeId,
                    employeeName: data.employeeName,
                    workId: data.workId || undefined,
                    weekStart: data.weekStart,
                    weekEnd: data.weekEnd,
                    daysWorked: Number(data.daysWorked) || 0,
                    dailyRate: Number(data.dailyRate) || 0,
                    advances: Number(data.advances) || 0,
                    reimbursements: Number(data.reimbursements) || 0,
                    totalLiquidated: Number(data.totalLiquidated) || 0,
                    paidAmount: Number(data.paidAmount) || 0,
                    status: data.status || 'pending',
                    createdAt: data.createdAt || new Date().toISOString(),
                };
            });
            items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            onData(items);
        },
        onError
    );
};

export const subscribeToPayrolls = (
    userId: string,
    onData: (records: PayrollRecord[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    let legacy: PayrollRecord[] = [];
    let weekly: PayrollRecord[] = [];
    const publish = () => onData([...legacy, ...weekly].sort((a, b) => b.weekStart.localeCompare(a.weekStart)));
    const unsubscribeLegacy = subscribeToLegacyPayrolls(userId, (data) => {
        legacy = data;
        publish();
    }, onError);
    const unsubscribeWeekly = subscribeToJournals(userId, (data) => {
        weekly = journalsAsPayrolls(data);
        publish();
    }, onError);
    return () => {
        unsubscribeLegacy();
        unsubscribeWeekly();
    };
};

export const createPayrollRecord = async (input: {
    userId: string;
    employeeId: string;
    employeeName: string;
    workId?: string;
    weekStart: string;
    weekEnd: string;
    daysWorked: number;
    dailyRate: number;
    advances: number;
    reimbursements: number;
    totalLiquidated?: number;
    paidAmount: number;
    status?: 'pending' | 'partial' | 'paid';
}): Promise<string> => {
    const calc = calculatePayroll({
        daysWorked: input.daysWorked,
        dailyRate: input.dailyRate,
        advances: input.advances,
        reimbursements: input.reimbursements,
        paidAmount: input.paidAmount,
    });

    const docRef = await addDoc(collection(db, PAYROLLS_COLLECTION), {
        userId: input.userId,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        workId: input.workId || '',
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        daysWorked: Number(input.daysWorked),
        dailyRate: Number(input.dailyRate),
        advances: Number(input.advances),
        reimbursements: Number(input.reimbursements),
        totalLiquidated: input.totalLiquidated ?? calc.totalLiquidated,
        paidAmount: Number(input.paidAmount),
        status: input.status ?? calc.status,
        createdAt: new Date().toISOString(),
    });

    return docRef.id;
};

export const markPayrollPaid = async (
    payrollId: string,
    totalLiquidated: number
): Promise<void> => {
    await updateDoc(doc(db, PAYROLLS_COLLECTION, payrollId), {
        paidAmount: totalLiquidated,
        status: 'paid',
    });
};

export const registerPayrollPayment = async (
    record: PayrollRecord,
    newPaidAmount: number
): Promise<void> => {
    const calc = calculatePayroll({
        daysWorked: record.daysWorked,
        dailyRate: record.dailyRate,
        advances: record.advances,
        reimbursements: record.reimbursements,
        paidAmount: newPaidAmount,
    });

    await updateDoc(doc(db, PAYROLLS_COLLECTION, record.id), {
        paidAmount: newPaidAmount,
        status: calc.status,
    });
};

export const deletePayrollRecord = async (payrollId: string): Promise<void> => {
    await deleteDoc(doc(db, PAYROLLS_COLLECTION, payrollId));
};
