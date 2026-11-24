// src/utils/calculations.ts
export interface PayrollCalculationInput {
    daysWorked: number;
    dailyRate: number;
    advances: number;
    reimbursements: number;
    paidAmount?: number;
}

export interface PayrollCalculationResult {
    grossPay: number;
    totalLiquidated: number;
    pendingBalance: number;
    status: 'pending' | 'partial' | 'paid';
}

export const calculatePayroll = (input: PayrollCalculationInput): PayrollCalculationResult => {
    const days = Math.max(0, Number(input.daysWorked) || 0);
    const rate = Math.max(0, Number(input.dailyRate) || 0);
    return settlePayroll(Math.round(days * rate * 100) / 100, input);
};

export const settlePayroll = (
    grossPay: number,
    input: Pick<PayrollCalculationInput, 'advances' | 'reimbursements' | 'paidAmount'>
): PayrollCalculationResult => {
    const advances = Math.max(0, Number(input.advances) || 0);
    const reimbursements = Math.max(0, Number(input.reimbursements) || 0);
    const paid = Math.max(0, Number(input.paidAmount) || 0);

    const totalLiquidated = Math.round((grossPay - advances + reimbursements) * 100) / 100;
    const pendingBalance = Math.max(0, Math.round((totalLiquidated - paid) * 100) / 100);

    let status: 'pending' | 'partial' | 'paid' = 'pending';
    if (paid >= totalLiquidated && totalLiquidated > 0) {
        status = 'paid';
    } else if (paid > 0 && paid < totalLiquidated) {
        status = 'partial';
    }

    return {
        grossPay,
        totalLiquidated,
        pendingBalance,
        status,
    };
};

export interface WorkMetricsInput {
    agreedBudget: number;
    collectedAmount: number;
    estimatedCosts: number;
}

export interface WorkMetricsResult {
    pendingCollection: number;
    estimatedProfit: number;
    profitMarginPercent: number;
}

export const calculateWorkMetrics = (input: WorkMetricsInput): WorkMetricsResult => {
    const budget = Math.max(0, Number(input.agreedBudget) || 0);
    const collected = Math.max(0, Number(input.collectedAmount) || 0);
    const costs = Math.max(0, Number(input.estimatedCosts) || 0);

    const pendingCollection = Math.max(0, Math.round((budget - collected) * 100) / 100);
    const estimatedProfit = Math.round((budget - costs) * 100) / 100;
    const profitMarginPercent =
        budget > 0 ? Math.round(((estimatedProfit / budget) * 100) * 100) / 100 : 0;

    return {
        pendingCollection,
        estimatedProfit,
        profitMarginPercent,
    };
};
