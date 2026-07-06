/**
 * VARIANTE WEB (vista previa): resumen de ejemplo en memoria, sin SQLite.
 * Reusa los mismos datos de muestra que `db/hooks.web.ts`.
 */
import { formatCurrency } from '@/lib/format';
import type { FinancialSnapshot } from './advisor';

export function buildFinancialSnapshot(): FinancialSnapshot {
  return {
    disposable: 1_744_000,
    remaining: 1_744_000,
    spentThisMonth: 655_000,
    dailyAllowance: 67_000,
    totalDebt: 8_200_000,
    topCategories: [
      { name: 'Hogar', total: 350_000 },
      { name: 'Compras', total: 120_000 },
      { name: 'Comida', total: 85_000 },
    ],
    currency: 'COP',
    daysLeft: 26,
    overspent: false,
    monthlyIncome: 2_600_000,
    savingsGoal: 200_000,
    periodLabel: 'Julio',
    willOverspend: true,
    projectedBalance: -5_989_333,
  };
}

export function buildSystemPrompt(snapshot: FinancialSnapshot): string {
  const money = (n: number) => formatCurrency(n, snapshot.currency);
  return `Asistente financiero (vista previa). Disponible: ${money(snapshot.disposable)}.`;
}
