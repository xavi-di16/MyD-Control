// src/types/index.ts
export type WorkStatus = 'planned' | 'active' | 'paused' | 'completed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type MovementType = 'income' | 'expense';
export type AccountType = 'myd' | 'household';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
}

export interface Employee {
    id: string;
    userId: string;
    name: string;
    role: string;
    dailyRate: number;
    active: boolean;
    isOwner?: boolean;
    createdAt: string;
}

export interface Work {
    id: string;
    userId: string;
    name: string;
    client: string;
    description: string;
    address: string;
    locality?: string;
    latitude: number | null;
    longitude: number | null;
    agreedBudget: number;
    collectedAmount: number;
    estimatedCosts: number;
    status: WorkStatus;
    startDate: string;
    estimatedEndDate?: string;
    createdAt: string;
}

export interface Task {
    id: string;
    userId: string;
    workId?: string;
    employeeId?: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    createdAt: string;
}

export interface Movement {
    id: string;
    userId: string;
    workId?: string;
    employeeId?: string;
    type: MovementType;
    account: AccountType;
    category: string;
    description: string;
    amount: number;
    date: string;
    createdAt: string;
    source?: 'payroll';
}

export interface PayrollRecord {
    id: string;
    userId: string;
    employeeId: string;
    employeeName: string;
    isOwner?: boolean;
    workId?: string;
    weekStart: string;
    weekEnd: string;
    daysWorked: number;
    dailyRate: number;
    advances: number;
    reimbursements: number;
    totalLiquidated: number;
    paidAmount: number;
    status: 'pending' | 'partial' | 'paid';
    createdAt: string;
}

export type AttendanceStatus = 'pending' | 'present' | 'half' | 'absent';

export interface AttendanceDay {
    status: AttendanceStatus;
    dailyRate: number | null;
    workId: string;
    workName: string;
}

export type PayrollEntryKind = 'advance' | 'reimbursement' | 'payment';

export interface PayrollEntry {
    id: string;
    kind: PayrollEntryKind;
    amount: number;
    date: string;
    reference: string;
    cashRecorded?: boolean;
}

export interface WeeklyJournal {
    userId: string;
    employeeId: string;
    employeeName: string;
    isOwner: boolean;
    weekStart: string;
    days: Record<string, AttendanceDay>;
    entries: PayrollEntry[];
    createdAt: string;
}

export interface WeeklyClosure {
    weekStart: string;
    closedAt: string;
}

export interface BudgetItem {
    id: string;
    userId: string;
    workId: string;
    type: 'material' | 'labor' | 'other';
    description: string;
    quantity: number;
    unitEstimatedCost: number;
    unitActualCost: number;
    createdAt: string;
}
