import { collection, doc, getDoc, onSnapshot, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { Employee } from '../../types';

export interface EmployeeProfile {
    ownerId: string;
    employeeId: string;
    employeeName: string;
    invitation: string;
}

interface EmployeeInvitation {
    ownerId: string;
    employeeId: string;
    employeeName: string;
    expiresAt: Timestamp;
    claimedBy: string;
}

export const watchEmployeeProfile = (uid: string, onData: (profile: EmployeeProfile | null) => void, onError: (error: Error) => void) =>
    onSnapshot(doc(db, 'employeeProfiles', uid), { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.fromCache && !snapshot.exists()) return;
        onData(snapshot.exists() ? snapshot.data() as EmployeeProfile : null);
    }, onError);

export const watchLinkedEmployees = (ownerId: string, onData: (ids: Set<string>) => void, onError: (error: Error) => void) =>
    onSnapshot(collection(db, 'staff', ownerId, 'employeeAccounts'), (snapshot) => onData(new Set(snapshot.docs.map((item) => item.id))), onError);

export const createEmployeeInvitation = async (employee: Employee) => {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    await setDoc(doc(db, 'employeeInvitations', code), {
        ownerId: employee.userId,
        employeeId: employee.id,
        employeeName: employee.name,
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
        claimedBy: '',
    } satisfies EmployeeInvitation);
    return new URL('/employee-enrollment/' + code, window.location.origin).href;
};

export const readEmployeeInvitation = async (code: string) => {
    if (!/^[a-f0-9]{48}$/.test(code)) return null;
    const snapshot = await getDoc(doc(db, 'employeeInvitations', code));
    return (snapshot.data() as EmployeeInvitation | undefined) ?? null;
};

export const linkEmployeeProfile = async (uid: string, code: string, invitation: EmployeeInvitation) => {
    const { ownerId, employeeId, employeeName } = invitation;
    const batch = writeBatch(db);
    batch.set(doc(db, 'employeeProfiles', uid), { ownerId, employeeId, employeeName, invitation: code } satisfies EmployeeProfile);
    batch.set(doc(db, 'staff', ownerId, 'employeeAccounts', employeeId), { uid });
    batch.update(doc(db, 'employeeInvitations', code), { claimedBy: uid });
    await batch.commit();
};
