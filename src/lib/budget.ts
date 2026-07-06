/**
 * Lógica central "Safe-to-Spend". Funciones PURAS (sin acceso a BD ni a Date.now
 * implícito): reciben todos los datos por parámetro para poder testearlas.
 *
 * Concepto: a partir del ingreso mensual se restan los compromisos del mes
 * (gastos fijos, meta de ahorro y pagos programados pendientes). Lo que queda es
 * el "disponible"; al restar lo ya gastado obtenemos lo que queda, y repartido
 * entre los días restantes del mes obtenemos el "puedes gastar hoy".
 */

export interface MonthRange {
  /** Primer día del período, inclusive (YYYY-MM-DD). */
  start: string;
  /** Último día del período, inclusive (YYYY-MM-DD). */
  end: string;
}

export interface BudgetInput {
  monthlyIncome: number;
  savingsGoal: number;
  /** Suma de gastos fijos mensuales. */
  fixedTotal: number;
  /** Suma de gastos programados aún NO pagados con vencimiento dentro del mes. */
  scheduledPendingThisMonth: number;
  /** Suma de gastos variables ya registrados en el mes en curso. */
  spentThisMonth: number;
  /** Fecha de referencia (hoy), YYYY-MM-DD. */
  todayISO: string;
  /** Rango del mes/período presupuestario. */
  range: MonthRange;
}

export interface BudgetResult {
  /** Dinero libre del mes tras compromisos (ingreso − fijos − programados − ahorro). */
  disposable: number;
  /** Disponible − gastado. Puede ser negativo (sobregasto). */
  remaining: number;
  /** Días restantes del período (incluye hoy). Mínimo 1. */
  daysLeft: number;
  /** Presupuesto sugerido para hoy = remaining / daysLeft (nunca negativo para mostrar). */
  dailyAllowance: number;
  /** true si ya se gastó más que el disponible. */
  overspent: boolean;
}

/** Días entre dos fechas ISO (b − a) contando por día calendario. */
export function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Días restantes del período incluyendo hoy (mínimo 1). */
export function daysLeftInRange(todayISO: string, range: MonthRange): number {
  const diff = daysBetween(todayISO, range.end);
  return Math.max(1, diff + 1);
}

export function computeBudget(input: BudgetInput): BudgetResult {
  const disposable =
    input.monthlyIncome -
    input.fixedTotal -
    input.scheduledPendingThisMonth -
    input.savingsGoal;

  const remaining = disposable - input.spentThisMonth;
  const daysLeft = daysLeftInRange(input.todayISO, input.range);
  const dailyAllowance = Math.max(0, remaining) / daysLeft;

  return {
    disposable,
    remaining,
    daysLeft,
    dailyAllowance,
    overspent: remaining < 0,
  };
}

export interface ProjectionResult {
  /** Ritmo de gasto por día transcurrido. */
  dailyPace: number;
  /** Gasto proyectado a fin de período al ritmo actual. */
  projectedSpend: number;
  /** Saldo proyectado a fin de período (disposable − projectedSpend). */
  projectedBalance: number;
  /** true si se proyecta terminar en negativo. */
  willOverspend: boolean;
  /** true si aún hay muy pocos días transcurridos para proyectar con fiabilidad. */
  lowConfidence: boolean;
}

/**
 * Días mínimos transcurridos para mostrar una proyección. Antes de esto, un solo
 * gasto grande al inicio del período distorsiona el ritmo y da cifras alarmistas.
 */
export const MIN_DAYS_FOR_PROJECTION = 5;

/**
 * Proyección a fin de período según el ritmo de gasto de los días ya transcurridos.
 */
export function computeProjection(input: BudgetInput, disposable: number): ProjectionResult {
  const totalDays = daysBetween(input.range.start, input.range.end) + 1;
  const daysElapsed = Math.max(1, daysBetween(input.range.start, input.todayISO) + 1);
  const dailyPace = input.spentThisMonth / daysElapsed;
  const projectedSpend = dailyPace * totalDays;
  const projectedBalance = disposable - projectedSpend;

  return {
    dailyPace,
    projectedSpend,
    projectedBalance,
    willOverspend: projectedBalance < 0,
    lowConfidence: daysElapsed < MIN_DAYS_FOR_PROJECTION,
  };
}

/** Suma de saldos pendientes de todas las deudas. */
export function totalDebt(debts: { currentBalance: number }[]): number {
  return debts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0);
}
