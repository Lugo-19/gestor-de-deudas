/**
 * Mutaciones de datos. Coordinan la escritura en SQLite y los efectos
 * secundarios (programar/cancelar recordatorios). Las lecturas reactivas viven
 * en `hooks.ts`.
 */
import { eq, sql } from 'drizzle-orm';

import { dayjs, today } from '@/lib/format';
import { cancelReminder, scheduleReminder } from '@/lib/notifications';
import { formatCurrency } from '@/lib/format';
import { db } from './client';
import {
  categories,
  debtPayments,
  debts,
  fixedExpenses,
  scheduledExpenses,
  transactions,
  type NewTransaction,
} from './schema';

// ---------- Transacciones ----------
export function addTransaction(data: Omit<NewTransaction, 'id' | 'createdAt'>) {
  return db.insert(transactions).values(data).run();
}

export function updateTransaction(id: number, patch: Partial<NewTransaction>) {
  return db.update(transactions).set(patch).where(eq(transactions.id, id)).run();
}

export function deleteTransaction(id: number) {
  return db.delete(transactions).where(eq(transactions.id, id)).run();
}

// ---------- Categorías ----------
export function addCategory(data: { name: string; icon: string; color: string; type: 'income' | 'expense' }) {
  return db.insert(categories).values({ ...data, isDefault: false }).run();
}

export function updateCategory(id: number, patch: Partial<typeof categories.$inferInsert>) {
  return db.update(categories).set(patch).where(eq(categories.id, id)).run();
}

export function deleteCategory(id: number) {
  // Desvincula las transacciones antes de borrar la categoría.
  db.update(transactions).set({ categoryId: null }).where(eq(transactions.categoryId, id)).run();
  return db.delete(categories).where(eq(categories.id, id)).run();
}

function getDebtCategoryId(): number | null {
  const cat =
    db.select().from(categories).where(eq(categories.name, 'Deudas')).get() ??
    db.select().from(categories).where(eq(categories.type, 'expense')).get();
  return cat?.id ?? null;
}

// ---------- Gastos fijos ----------
export function addFixedExpense(data: { name: string; amount: number; categoryId?: number | null; dayOfMonth: number }) {
  return db.insert(fixedExpenses).values(data).run();
}

export function deleteFixedExpense(id: number) {
  return db.delete(fixedExpenses).where(eq(fixedExpenses.id, id)).run();
}

// ---------- Deudas ----------
export function addDebt(data: {
  name: string;
  creditor?: string | null;
  originalAmount: number;
  interestRate?: number | null;
  dueDate?: string | null;
  monthlyPayment?: number | null;
}) {
  return db
    .insert(debts)
    .values({ ...data, currentBalance: data.originalAmount })
    .run();
}

export function updateDebt(id: number, patch: Partial<typeof debts.$inferInsert>) {
  return db.update(debts).set(patch).where(eq(debts.id, id)).run();
}

export function deleteDebt(id: number) {
  return db.delete(debts).where(eq(debts.id, id)).run();
}

/**
 * Registra un pago de deuda: reduce el saldo, guarda el pago y crea una
 * transacción de gasto asociada (para que impacte el presupuesto).
 */
export function addDebtPayment(debtId: number, amount: number, date = today()) {
  db.insert(debtPayments).values({ debtId, amount, date }).run();
  db.update(debts)
    .set({ currentBalance: sql`MAX(0, ${debts.currentBalance} - ${amount})` })
    .where(eq(debts.id, debtId))
    .run();
  const debt = db.select().from(debts).where(eq(debts.id, debtId)).get();
  addTransaction({
    amount,
    type: 'expense',
    categoryId: getDebtCategoryId(),
    date,
    note: debt ? `Pago: ${debt.name}` : 'Pago de deuda',
    debtId,
  });
}

// ---------- Gastos programados ----------
export async function addScheduled(data: {
  name: string;
  amount: number;
  categoryId?: number | null;
  dueDate: string;
  recurrence: 'none' | 'weekly' | 'monthly';
  reminderEnabled: boolean;
  debtId?: number | null;
  currency?: string;
}) {
  let notificationId: string | null = null;
  if (data.reminderEnabled) {
    notificationId = await scheduleReminder(
      'Pago programado',
      `${data.name} · ${formatCurrency(data.amount, data.currency ?? 'USD')}`,
      data.dueDate,
    );
  }
  return db
    .insert(scheduledExpenses)
    .values({
      name: data.name,
      amount: data.amount,
      categoryId: data.categoryId ?? null,
      dueDate: data.dueDate,
      recurrence: data.recurrence,
      reminderEnabled: data.reminderEnabled,
      debtId: data.debtId ?? null,
      notificationId,
    })
    .run();
}

export async function deleteScheduled(id: number) {
  const row = db.select().from(scheduledExpenses).where(eq(scheduledExpenses.id, id)).get();
  await cancelReminder(row?.notificationId);
  return db.delete(scheduledExpenses).where(eq(scheduledExpenses.id, id)).run();
}

/**
 * Marca un programado como pagado: crea la transacción correspondiente y, si es
 * recurrente, genera la siguiente ocurrencia (con su recordatorio).
 */
export async function markScheduledPaid(id: number, currency = 'USD') {
  const row = db.select().from(scheduledExpenses).where(eq(scheduledExpenses.id, id)).get();
  if (!row) return;

  addTransaction({
    amount: row.amount,
    type: 'expense',
    categoryId: row.categoryId,
    date: today(),
    note: row.name,
    scheduledId: row.id,
    debtId: row.debtId,
  });

  // Si es un pago de deuda programado, también reduce el saldo.
  if (row.debtId) {
    db.update(debts)
      .set({ currentBalance: sql`MAX(0, ${debts.currentBalance} - ${row.amount})` })
      .where(eq(debts.id, row.debtId))
      .run();
    db.insert(debtPayments).values({ debtId: row.debtId, amount: row.amount, date: today() }).run();
  }

  await cancelReminder(row.notificationId);

  if (row.recurrence === 'none') {
    db.update(scheduledExpenses).set({ isPaid: true, notificationId: null }).where(eq(scheduledExpenses.id, id)).run();
  } else {
    // Avanza a la siguiente fecha y reprograma.
    const unit = row.recurrence === 'weekly' ? 'week' : 'month';
    const nextDue = dayjs(row.dueDate).add(1, unit).format('YYYY-MM-DD');
    let nextNotif: string | null = null;
    if (row.reminderEnabled) {
      nextNotif = await scheduleReminder(
        'Pago programado',
        `${row.name} · ${formatCurrency(row.amount, currency)}`,
        nextDue,
      );
    }
    db.update(scheduledExpenses)
      .set({ dueDate: nextDue, isPaid: false, notificationId: nextNotif })
      .where(eq(scheduledExpenses.id, id))
      .run();
  }
}
