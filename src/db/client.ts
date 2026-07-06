/**
 * Cliente de base de datos. Abre SQLite de forma síncrona (arranque sin flash),
 * crea el esquema de forma idempotente (CREATE TABLE IF NOT EXISTS) y expone la
 * instancia Drizzle para queries type-safe + `useLiveQuery` reactivo.
 *
 * Se gestiona el DDL a mano (en vez de drizzle-kit) para no requerir configuración
 * extra de Metro; el esquema aquí debe mantenerse alineado con `schema.ts`.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DB_NAME = 'appcuentas.db';

const expoDb = openDatabaseSync(DB_NAME, { enableChangeListener: true });

const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#7C5CFC',
  type TEXT NOT NULL DEFAULT 'expense',
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category_id INTEGER REFERENCES categories(id),
  date TEXT NOT NULL,
  note TEXT,
  debt_id INTEGER,
  scheduled_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  day_of_month INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budget_settings (
  id INTEGER PRIMARY KEY,
  monthly_income REAL NOT NULL DEFAULT 0,
  savings_goal REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT NOT NULL DEFAULT 'es',
  month_start_day INTEGER NOT NULL DEFAULT 1,
  theme_mode TEXT NOT NULL DEFAULT 'system',
  accent_color TEXT NOT NULL DEFAULT '#7C5CFC',
  onboarded INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  creditor TEXT,
  original_amount REAL NOT NULL,
  current_balance REAL NOT NULL,
  interest_rate REAL,
  due_date TEXT,
  monthly_payment REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  due_date TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'none',
  reminder_enabled INTEGER NOT NULL DEFAULT 1,
  is_paid INTEGER NOT NULL DEFAULT 0,
  debt_id INTEGER,
  notification_id TEXT
);

CREATE TABLE IF NOT EXISTS llm_config (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduled_expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_debt ON debt_payments(debt_id);
`;

/** Ejecuta el DDL de forma síncrona. Idempotente: seguro de llamar en cada arranque. */
export function initSchema() {
  expoDb.execSync(DDL);
}

export const db = drizzle(expoDb, { schema });
export { expoDb };
