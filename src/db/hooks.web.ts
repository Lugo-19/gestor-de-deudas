/**
 * VARIANTE WEB de los hooks de datos (vista previa en navegador). Devuelve datos
 * de EJEMPLO en memoria para revisar el diseño de todas las pantallas sin SQLite.
 * El móvil usa `hooks.ts` real (Drizzle + useLiveQuery). Mantener las MISMAS
 * firmas que en `hooks.ts`.
 */
import { useMemo } from 'react';

import { computeBudget, computeProjection, type MonthRange } from '@/lib/budget';
import { getCurrentPeriod } from '@/lib/period';
import { today, dayjs } from '@/lib/format';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import type { Category, Debt, FixedExpense, ScheduledExpense, Transaction } from '@/db/schema';

const CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
  id: i + 1,
  name: c.name,
  icon: c.icon,
  color: c.color,
  type: c.type,
  isDefault: true,
  sortOrder: i,
}));

const byName = (n: string) => CATEGORIES.find((c) => c.name === n)?.id ?? null;

const TRANSACTIONS: Transaction[] = [
  { id: 1, amount: 85_000, type: 'expense', categoryId: byName('Comida'), date: today(), note: 'Mercado', debtId: null, scheduledId: null, createdAt: today() },
  { id: 2, amount: 40_000, type: 'expense', categoryId: byName('Transporte'), date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), note: 'Gasolina', debtId: null, scheduledId: null, createdAt: today() },
  { id: 3, amount: 350_000, type: 'expense', categoryId: byName('Hogar'), date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), note: 'Servicios', debtId: null, scheduledId: null, createdAt: today() },
  { id: 4, amount: 120_000, type: 'expense', categoryId: byName('Compras'), date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'), note: 'Ropa', debtId: null, scheduledId: null, createdAt: today() },
  { id: 5, amount: 60_000, type: 'expense', categoryId: byName('Ocio'), date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'), note: 'Cine', debtId: null, scheduledId: null, createdAt: today() },
  { id: 6, amount: 2_600_000, type: 'income', categoryId: byName('Sueldo'), date: dayjs().startOf('month').format('YYYY-MM-DD'), note: 'Salario', debtId: null, scheduledId: null, createdAt: today() },
];

const DEBTS: Debt[] = [
  { id: 1, name: 'Tarjeta de crédito', creditor: 'Banco', originalAmount: 3_000_000, currentBalance: 1_800_000, interestRate: null, dueDate: dayjs().add(12, 'day').format('YYYY-MM-DD'), monthlyPayment: 300_000, createdAt: today() },
  { id: 2, name: 'Moto', creditor: null, originalAmount: 8_000_000, currentBalance: 6_400_000, interestRate: null, dueDate: null, monthlyPayment: 400_000, createdAt: today() },
];

const SCHEDULED: ScheduledExpense[] = [
  { id: 1, name: 'Netflix', amount: 44_900, categoryId: byName('Ocio'), dueDate: dayjs().add(5, 'day').format('YYYY-MM-DD'), recurrence: 'monthly', reminderEnabled: true, isPaid: false, debtId: null, notificationId: null },
  { id: 2, name: 'Luz', amount: 180_000, categoryId: byName('Servicios'), dueDate: dayjs().add(9, 'day').format('YYYY-MM-DD'), recurrence: 'monthly', reminderEnabled: true, isPaid: false, debtId: null, notificationId: null },
];

const FIXED: FixedExpense[] = [
  { id: 1, name: 'Renta', amount: 900_000, categoryId: byName('Hogar'), dayOfMonth: 1 },
  { id: 2, name: 'Internet', amount: 120_000, categoryId: byName('Servicios'), dayOfMonth: 5 },
];

const expensesThisMonth = TRANSACTIONS.filter((t) => t.type === 'expense');
const spentThisMonth = expensesThisMonth.reduce((s, t) => s + t.amount, 0);
const fixedTotal = FIXED.reduce((s, f) => s + f.amount, 0);
const scheduledPending = SCHEDULED.reduce((s, x) => s + x.amount, 0);

export function useCategories(type?: 'income' | 'expense') {
  return useMemo(() => (type ? CATEGORIES.filter((c) => c.type === type) : CATEGORIES), [type]);
}

export function useCategoryMap() {
  return useMemo(() => {
    const map = new Map<number, Category>();
    CATEGORIES.forEach((c) => map.set(c.id, c));
    return map;
  }, []);
}

export function useCurrentPeriod(): MonthRange {
  return useMemo(() => getCurrentPeriod(1), []);
}

export function useBudgetSnapshot() {
  const range = useCurrentPeriod();
  return useMemo(() => {
    const input = {
      monthlyIncome: 2_600_000,
      savingsGoal: 200_000,
      fixedTotal,
      scheduledPendingThisMonth: scheduledPending,
      spentThisMonth,
      todayISO: today(),
      range,
    };
    const budget = computeBudget(input);
    const projection = computeProjection(input, budget.disposable);
    return { ...budget, projection, spentThisMonth, fixedTotal, scheduledPendingThisMonth: scheduledPending, range };
  }, [range]);
}

export function useCategoryBreakdown(_range: MonthRange) {
  return useMemo(() => {
    const map = new Map<number, number>();
    expensesThisMonth.forEach((t) => {
      if (t.categoryId == null) return;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    });
    return Array.from(map.entries()).map(([categoryId, total]) => ({ categoryId, total }));
  }, []);
}

export function useRecentTransactions(limit = 6) {
  return useMemo(() => [...TRANSACTIONS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit), [limit]);
}

export function useTransactions(_range?: MonthRange, categoryId?: number | null) {
  return useMemo(() => {
    const list = [...TRANSACTIONS].sort((a, b) => (a.date < b.date ? 1 : -1));
    return categoryId != null ? list.filter((t) => t.categoryId === categoryId) : list;
  }, [categoryId]);
}

export function useDebts() {
  return DEBTS;
}

export function useTotalDebt() {
  return DEBTS.reduce((s, d) => s + d.currentBalance, 0);
}

export function useLiveDebt(id: number | null) {
  return useMemo(() => DEBTS.find((d) => d.id === id) ?? null, [id]);
}

export function useScheduled(_includePaid = false) {
  return SCHEDULED;
}

export function useUpcomingPayments(_days = 14) {
  return SCHEDULED;
}

export function useFixedExpenses(): FixedExpense[] {
  return FIXED;
}

export function useMonthlyExpenseSeries(months = 6) {
  return useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = dayjs();
    const sample = [820_000, 640_000, 910_000, 1_050_000, 730_000, spentThisMonth];
    const series: { label: string; value: number; ym: string }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = now.subtract(i, 'month');
      series.push({ label: monthNames[d.month()], value: sample[(months - 1 - i) % sample.length], ym: d.format('YYYY-MM') });
    }
    return series;
  }, [months]);
}

export function useHasData() {
  return true;
}
