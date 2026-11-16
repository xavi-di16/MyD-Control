// src/utils/__tests__/calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePayroll, calculateWorkMetrics } from '../calculations';

describe('Calculations Utility (Jornales y Rentabilidad de Obras)', () => {
    describe('calculatePayroll', () => {
        it('calcula correctamente el jornal bruto, total a liquidar y saldo pendiente con adelantos y reintegros', () => {
            const result = calculatePayroll({
                daysWorked: 5,
                dailyRate: 30000,
                advances: 30000,
                reimbursements: 10000,
                paidAmount: 50000,
            });

            expect(result.grossPay).toBe(150000);
            expect(result.totalLiquidated).toBe(130000);
            expect(result.pendingBalance).toBe(80000);
            expect(result.status).toBe('partial');
        });

        it('marca la liquidación como pagada (paid) cuando el monto abonado cubre el total liquidado', () => {
            const result = calculatePayroll({
                daysWorked: 4,
                dailyRate: 25000,
                advances: 0,
                reimbursements: 0,
                paidAmount: 100000,
            });

            expect(result.grossPay).toBe(100000);
            expect(result.totalLiquidated).toBe(100000);
            expect(result.pendingBalance).toBe(0);
            expect(result.status).toBe('paid');
        });

        it('maneja valores negativos o en cero como caso borde de forma segura', () => {
            const result = calculatePayroll({
                daysWorked: -2,
                dailyRate: 30000,
                advances: -5000,
                reimbursements: 0,
                paidAmount: 0,
            });

            expect(result.grossPay).toBe(0);
            expect(result.totalLiquidated).toBe(0);
            expect(result.pendingBalance).toBe(0);
            expect(result.status).toBe('pending');
        });
    });

    describe('calculateWorkMetrics', () => {
        it('calcula cobranza pendiente, ganancia estimada y porcentaje de margen', () => {
            const metrics = calculateWorkMetrics({
                agreedBudget: 1000000,
                collectedAmount: 400000,
                estimatedCosts: 600000,
            });

            expect(metrics.pendingCollection).toBe(600000);
            expect(metrics.estimatedProfit).toBe(400000);
            expect(metrics.profitMarginPercent).toBe(40);
        });

        it('evita división por cero cuando el presupuesto acordado es 0', () => {
            const metrics = calculateWorkMetrics({
                agreedBudget: 0,
                collectedAmount: 0,
                estimatedCosts: 150000,
            });

            expect(metrics.pendingCollection).toBe(0);
            expect(metrics.estimatedProfit).toBe(-150000);
            expect(metrics.profitMarginPercent).toBe(0);
        });
    });
});