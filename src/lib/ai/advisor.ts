/**
 * Tipos compartidos del asistente de IA y el asesor de recomendaciones.
 *
 * El resumen financiero agregado lo construye `context.buildFinancialSnapshot()`
 * (nunca se envían datos crudos innecesarios a un proveedor externo).
 */

export interface FinancialSnapshot {
  disposable: number;
  remaining: number;
  spentThisMonth: number;
  dailyAllowance: number;
  totalDebt: number;
  topCategories: { name: string; total: number }[];
  currency: string;
  // Campos extra opcionales para enriquecer el system prompt.
  daysLeft?: number;
  overspent?: boolean;
  monthlyIncome?: number;
  savingsGoal?: number;
  periodLabel?: string;
  willOverspend?: boolean;
  projectedBalance?: number;
}

export interface Advice {
  id: string;
  tone: 'info' | 'warning' | 'success';
  title: string;
  body: string;
}

/**
 * Asesor de recomendaciones (opcional). El asistente conversacional vive en
 * `agent.ts`; esta función queda para una vista de "consejos" del dashboard.
 * Requiere un proveedor configurado; hoy devuelve lista vacía si no hay IA.
 */
export async function getRecommendations(_snapshot: FinancialSnapshot): Promise<Advice[]> {
  // TODO(fase C+): generar consejos con el proveedor configurado.
  return [];
}
