/**
 * Esquema Drizzle (expo-sqlite). Los montos se guardan como REAL y las fechas
 * como texto ISO (YYYY-MM-DD o ISO completo) para operar fácil con dayjs.
 */
import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('tag'),
  color: text('color').notNull().default('#7C5CFC'),
  type: text('type', { enum: ['income', 'expense'] }).notNull().default('expense'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull().default('expense'),
  categoryId: integer('category_id').references(() => categories.id),
  date: text('date').notNull(), // YYYY-MM-DD
  note: text('note'),
  debtId: integer('debt_id'),
  scheduledId: integer('scheduled_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const fixedExpenses = sqliteTable('fixed_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  dayOfMonth: integer('day_of_month').notNull().default(1),
});

export const budgetSettings = sqliteTable('budget_settings', {
  id: integer('id').primaryKey(), // fila única = 1
  monthlyIncome: real('monthly_income').notNull().default(0),
  savingsGoal: real('savings_goal').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  locale: text('locale').notNull().default('es'),
  monthStartDay: integer('month_start_day').notNull().default(1),
  themeMode: text('theme_mode', { enum: ['system', 'light', 'dark'] }).notNull().default('system'),
  accentColor: text('accent_color').notNull().default('#7C5CFC'),
  onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
});

export const debts = sqliteTable('debts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  creditor: text('creditor'),
  originalAmount: real('original_amount').notNull(),
  currentBalance: real('current_balance').notNull(),
  interestRate: real('interest_rate'),
  dueDate: text('due_date'),
  monthlyPayment: real('monthly_payment'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const debtPayments = sqliteTable('debt_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  debtId: integer('debt_id').notNull().references(() => debts.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
});

export const scheduledExpenses = sqliteTable('scheduled_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  dueDate: text('due_date').notNull(),
  recurrence: text('recurrence', { enum: ['none', 'weekly', 'monthly'] }).notNull().default('none'),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(true),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
  debtId: integer('debt_id'),
  notificationId: text('notification_id'),
});

/**
 * Configuración del asistente de IA (fila única = 1). La LLAVE del proveedor NO
 * se guarda aquí: vive cifrada en expo-secure-store (ver lib/ai/keys.ts).
 */
export const llmConfig = sqliteTable('llm_config', {
  id: integer('id').primaryKey(), // fila única = 1
  provider: text('provider', { enum: ['gemini', 'claude', 'openai'] }).notNull().default('gemini'),
  model: text('model').notNull().default(''),
});

export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type BudgetSettings = typeof budgetSettings.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type ScheduledExpense = typeof scheduledExpenses.$inferSelect;
export type LlmConfig = typeof llmConfig.$inferSelect;
