/**
 * Lecturas reactivas de la base de datos. Cada hook usa `useLiveQuery` de Drizzle
 * para que la UI se actualice sola cuando cambian los datos (sin recargas
 * manuales). Los agregados se calculan en SQL (eficiente) y se combinan con la
 * lógica pura de `lib/budget`.
 */
import { useMemo } from 'react';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { computeBudget, computeProjection, type MonthRange } from '@/lib/budget';
import { getCurrentPeriod } from '@/lib/period';
import { today } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { db } from './client';
import {
  categories,
  debts,
  fixedExpenses,
  scheduledExpenses,
  transactions,
  type Category,
  type FixedExpense,
} from './schema';

export function useCategories(type?: 'income' | 'expense') {
  const q = type
    ? db.select().from(categories).where(eq(categories.type, type)).orderBy(categories.sortOrder)
    : db.select().from(categories).orderBy(categories.type, categories.sortOrder);
  // La dependencia [type] hace que la consulta se rehaga al cambiar Gasto/Ingreso.
  const { data } = useLiveQuery(q, [type]);
  return (data ?? []) as Category[];
}

/** Mapa id→categoría para resolver iconos/colores rápido en listas. */
export function useCategoryMap() {
  const cats = useCategories();
  return useMemo(() => {
    const map = new Map<number, Category>();
    cats.forEach((c) => map.set(c.id, c));
    return map;
  }, [cats]);
}

export function useCurrentPeriod(): MonthRange {
  const monthStartDay = useSettings((s) => s.settings.monthStartDay);
  return useMemo(() => getCurrentPeriod(monthStartDay), [monthStartDay]);
}

/** Snapshot presupuestario reactivo: el corazón del Dashboard. */
export function useBudgetSnapshot() {
  const settings = useSettings((s) => s.settings);
  const range = useCurrentPeriod();
  const todayISO = today();

  const spentQ = useLiveQuery(
    db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'expense'),
          gte(transactions.date, range.start),
          lte(transactions.date, range.end),
        ),
      ),
    [range.start, range.end],
  );

  const fixedQ = useLiveQuery(
    db.select({ total: sql<number>`COALESCE(SUM(${fixedExpenses.amount}), 0)` }).from(fixedExpenses),
  );

  const scheduledQ = useLiveQuery(
    db
      .select({ total: sql<number>`COALESCE(SUM(${scheduledExpenses.amount}), 0)` })
      .from(scheduledExpenses)
      .where(
        and(
          eq(scheduledExpenses.isPaid, false),
          gte(scheduledExpenses.dueDate, todayISO),
          lte(scheduledExpenses.dueDate, range.end),
        ),
      ),
    [todayISO, range.end],
  );

  const spentThisMonth = spentQ.data?.[0]?.total ?? 0;
  const fixedTotal = fixedQ.data?.[0]?.total ?? 0;
  const scheduledPendingThisMonth = scheduledQ.data?.[0]?.total ?? 0;

  return useMemo(() => {
    const input = {
      monthlyIncome: settings.monthlyIncome,
      savingsGoal: settings.savingsGoal,
      fixedTotal,
      scheduledPendingThisMonth,
      spentThisMonth,
      todayISO,
      range,
    };
    const budget = computeBudget(input);
    const projection = computeProjection(input, budget.disposable);
    return { ...budget, projection, spentThisMonth, fixedTotal, scheduledPendingThisMonth, range };
  }, [settings.monthlyIncome, settings.savingsGoal, fixedTotal, scheduledPendingThisMonth, spentThisMonth, todayISO, range]);
}

/** Desglose de gasto por categoría en el período (para la dona). */
export function useCategoryBreakdown(range: MonthRange) {
  const { data } = useLiveQuery(
    db
      .select({
        categoryId: transactions.categoryId,
        total: sql<number>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'expense'),
          gte(transactions.date, range.start),
          lte(transactions.date, range.end),
        ),
      )
      .groupBy(transactions.categoryId),
    [range.start, range.end],
  );
  return data ?? [];
}

export function useRecentTransactions(limit = 6) {
  const { data } = useLiveQuery(
    db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.id)).limit(limit),
  );
  return data ?? [];
}

export function useTransactions(range?: MonthRange, categoryId?: number | null) {
  const conditions = [];
  if (range) {
    conditions.push(gte(transactions.date, range.start));
    conditions.push(lte(transactions.date, range.end));
  }
  if (categoryId != null) conditions.push(eq(transactions.categoryId, categoryId));

  const { data } = useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date), desc(transactions.id)),
    [range?.start, range?.end, categoryId],
  );
  return data ?? [];
}

export function useDebts() {
  const { data } = useLiveQuery(db.select().from(debts).orderBy(desc(debts.currentBalance)));
  return data ?? [];
}

export function useFixedExpenses(): FixedExpense[] {
  const { data } = useLiveQuery(db.select().from(fixedExpenses).orderBy(desc(fixedExpenses.amount)));
  return (data ?? []) as FixedExpense[];
}

export function useLiveDebt(id: number | null) {
  const { data } = useLiveQuery(
    db.select().from(debts).where(eq(debts.id, id ?? -1)),
    [id],
  );
  return data?.[0] ?? null;
}

export function useTotalDebt() {
  const { data } = useLiveQuery(
    db.select({ total: sql<number>`COALESCE(SUM(${debts.currentBalance}), 0)` }).from(debts),
  );
  return data?.[0]?.total ?? 0;
}

export function useScheduled(includePaid = false) {
  const q = includePaid
    ? db.select().from(scheduledExpenses).orderBy(scheduledExpenses.dueDate)
    : db
        .select()
        .from(scheduledExpenses)
        .where(eq(scheduledExpenses.isPaid, false))
        .orderBy(scheduledExpenses.dueDate);
  const { data } = useLiveQuery(q, [includePaid]);
  return data ?? [];
}

/** Próximos pagos (programados no pagados) dentro de los próximos `days` días. */
export function useUpcomingPayments(days = 14) {
  const todayISO = today();
  const limit = getCurrentPeriodPlus(days);
  const { data } = useLiveQuery(
    db
      .select()
      .from(scheduledExpenses)
      .where(
        and(
          eq(scheduledExpenses.isPaid, false),
          gte(scheduledExpenses.dueDate, todayISO),
          lte(scheduledExpenses.dueDate, limit),
        ),
      )
      .orderBy(scheduledExpenses.dueDate)
      .limit(5),
    [todayISO, limit],
  );
  return data ?? [];
}

function getCurrentPeriodPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Serie de gasto de los últimos `months` meses (para el gráfico de barras). */
export function useMonthlyExpenseSeries(months = 6) {
  const { data } = useLiveQuery(
    db
      .select({
        ym: sql<string>`substr(${transactions.date}, 1, 7)`,
        total: sql<number>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .where(eq(transactions.type, 'expense'))
      .groupBy(sql`substr(${transactions.date}, 1, 7)`),
  );
  return useMemo(() => {
    const map = new Map<string, number>();
    (data ?? []).forEach((r) => map.set(r.ym, r.total));
    const now = new Date();
    const series: { label: string; value: number; ym: string }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      series.push({ label: monthNames[d.getMonth()], value: map.get(ym) ?? 0, ym });
    }
    return series;
  }, [data, months]);
}

export function useHasData() {
  const { data } = useLiveQuery(
    db.select({ count: sql<number>`count(*)` }).from(transactions),
  );
  return (data?.[0]?.count ?? 0) > 0;
}
