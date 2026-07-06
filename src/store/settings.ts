/**
 * Store de configuración (Zustand). Fuente única de las preferencias del usuario:
 * tema, color de acento, moneda, ingreso mensual, meta de ahorro, onboarding.
 *
 * Se inicializa de forma síncrona desde SQLite (sin flash al arrancar) y cada
 * cambio se persiste de vuelta en la fila única `budget_settings`.
 */
import { eq } from 'drizzle-orm';
import { create } from 'zustand';

import { db, initSchema } from '@/db/client';
import { seedIfNeeded } from '@/db/seed';
import { budgetSettings, type BudgetSettings } from '@/db/schema';

// Arranque de la base (idempotente) antes de leer nada.
initSchema();
seedIfNeeded();

function readSettings(): BudgetSettings {
  const row = db.select().from(budgetSettings).where(eq(budgetSettings.id, 1)).get();
  if (row) return row;
  // Salvaguarda: si por algo no existe, la creamos.
  db.insert(budgetSettings).values({ id: 1 }).onConflictDoNothing().run();
  return db.select().from(budgetSettings).where(eq(budgetSettings.id, 1)).get()!;
}

type SettingsPatch = Partial<Omit<BudgetSettings, 'id'>>;

interface SettingsState {
  settings: BudgetSettings;
  update: (patch: SettingsPatch) => void;
  completeOnboarding: (patch: SettingsPatch) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: readSettings(),
  update: (patch) => {
    db.update(budgetSettings).set(patch).where(eq(budgetSettings.id, 1)).run();
    set({ settings: { ...get().settings, ...patch } });
  },
  completeOnboarding: (patch) => {
    const full = { ...patch, onboarded: true };
    db.update(budgetSettings).set(full).where(eq(budgetSettings.id, 1)).run();
    set({ settings: { ...get().settings, ...full } });
  },
}));
