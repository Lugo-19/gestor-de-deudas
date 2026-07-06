/**
 * VARIANTE WEB del store de configuración (vista previa en navegador).
 * En memoria, sin SQLite. `update` funciona para poder probar el cambio de tema
 * y color de acento en vivo. El móvil usa `settings.ts` real.
 */
import { create } from 'zustand';

import type { BudgetSettings } from '@/db/schema';

const initial: BudgetSettings = {
  id: 1,
  monthlyIncome: 2_600_000,
  savingsGoal: 200_000,
  currency: 'COP',
  locale: 'es',
  monthStartDay: 1,
  themeMode: 'dark',
  accentColor: '#7C5CFC',
  onboarded: true,
};

type SettingsPatch = Partial<Omit<BudgetSettings, 'id'>>;

interface SettingsState {
  settings: BudgetSettings;
  update: (patch: SettingsPatch) => void;
  completeOnboarding: (patch: SettingsPatch) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: initial,
  update: (patch) => set({ settings: { ...get().settings, ...patch } }),
  completeOnboarding: (patch) => set({ settings: { ...get().settings, ...patch, onboarded: true } }),
}));
