/**
 * Construye el CONTEXTO que recibe la IA: un resumen AGREGADO de las finanzas
 * (nunca la lista cruda de movimientos) más el system prompt en español.
 *
 * Son funciones imperativas (no hooks): leen SQLite de forma síncrona con
 * `db.select().…get()/.all()`, para poder usarse dentro de los handlers de
 * herramientas y del bucle del agente, fuera de React.
 */
import { and, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { budgetSettings, categories, debts, fixedExpenses, scheduledExpenses, transactions } from '@/db/schema';
import { computeBudget, computeProjection } from '@/lib/budget';
import { getCurrentPeriod } from '@/lib/period';
import { today, formatCurrency, dayjs } from '@/lib/format';
import { periodLabel } from '@/lib/period';
import type { FinancialSnapshot } from './advisor';

/** Lee la fila única de configuración (id = 1). */
function readSettings() {
  return db.select().from(budgetSettings).where(eq(budgetSettings.id, 1)).get();
}

/**
 * Resumen financiero agregado del período actual. Reusa la lógica pura de
 * `lib/budget` con datos leídos de la BD.
 */
export function buildFinancialSnapshot(): FinancialSnapshot {
  const settings = readSettings();
  const currency = settings?.currency ?? 'USD';
  const monthStartDay = settings?.monthStartDay ?? 1;
  const range = getCurrentPeriod(monthStartDay);
  const todayISO = today();

  const spentThisMonth =
    db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.type, 'expense'), gte(transactions.date, range.start), lte(transactions.date, range.end)))
      .get()?.total ?? 0;

  const fixedTotal =
    db.select({ total: sql<number>`COALESCE(SUM(${fixedExpenses.amount}), 0)` }).from(fixedExpenses).get()?.total ?? 0;

  const scheduledPendingThisMonth =
    db
      .select({ total: sql<number>`COALESCE(SUM(${scheduledExpenses.amount}), 0)` })
      .from(scheduledExpenses)
      .where(and(eq(scheduledExpenses.isPaid, false), gte(scheduledExpenses.dueDate, todayISO), lte(scheduledExpenses.dueDate, range.end)))
      .get()?.total ?? 0;

  const totalDebt =
    db.select({ total: sql<number>`COALESCE(SUM(${debts.currentBalance}), 0)` }).from(debts).get()?.total ?? 0;

  const input = {
    monthlyIncome: settings?.monthlyIncome ?? 0,
    savingsGoal: settings?.savingsGoal ?? 0,
    fixedTotal,
    scheduledPendingThisMonth,
    spentThisMonth,
    todayISO,
    range,
  };
  const budget = computeBudget(input);
  const projection = computeProjection(input, budget.disposable);

  // Top categorías de gasto del período (nombre + total).
  const breakdown = db
    .select({ categoryId: transactions.categoryId, total: sql<number>`SUM(${transactions.amount})` })
    .from(transactions)
    .where(and(eq(transactions.type, 'expense'), gte(transactions.date, range.start), lte(transactions.date, range.end)))
    .groupBy(transactions.categoryId)
    .all();
  const cats = db.select().from(categories).all();
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const topCategories = breakdown
    .map((b) => ({ name: (b.categoryId != null ? catName.get(b.categoryId) : null) ?? 'Otros', total: b.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    disposable: budget.disposable,
    remaining: budget.remaining,
    spentThisMonth,
    dailyAllowance: budget.dailyAllowance,
    totalDebt,
    topCategories,
    currency,
    // Campos extra útiles para el prompt (opcionales en la interfaz).
    daysLeft: budget.daysLeft,
    overspent: budget.overspent,
    monthlyIncome: settings?.monthlyIncome ?? 0,
    savingsGoal: settings?.savingsGoal ?? 0,
    periodLabel: periodLabel(range),
    willOverspend: projection.willOverspend,
    projectedBalance: projection.projectedBalance,
  };
}

/**
 * System prompt en español: describe al asistente, sus reglas y le entrega el
 * resumen agregado para que responda sin gastar una llamada de herramienta en
 * lo básico.
 */
export function buildSystemPrompt(snapshot: FinancialSnapshot): string {
  const c = snapshot.currency;
  const money = (n: number) => formatCurrency(n, c);
  const tops = snapshot.topCategories.length
    ? snapshot.topCategories.map((t) => `${t.name} ${money(t.total)}`).join(', ')
    : 'sin gastos registrados';

  return [
    'Eres el asistente financiero de "app-cuentas", una app personal de finanzas.',
    'Hablas español, claro y breve. Tuteas al usuario y evitas tecnicismos.',
    '',
    'Puedes CONSULTAR datos y EJECUTAR acciones (registrar movimientos, añadir o',
    'ajustar deudas, programar gastos, etc.) usando las herramientas disponibles.',
    '',
    'Reglas:',
    '- Usa las herramientas de lectura cuando necesites detalle que no esté en el resumen.',
    '- Para crear, modificar o eliminar algo, llama a la herramienta de escritura correspondiente;',
    '  la app pedirá confirmación al usuario, así que no preguntes tú "¿seguro?" antes.',
    '- No inventes cifras: si no las tienes, consulta con una herramienta.',
    '- Si el usuario adjunta una foto o PDF (recibo, factura, extracto), lee el importe,',
    '  la fecha y el concepto, y usa registrar_movimiento para proponer cada gasto o ingreso',
    '  (uno por línea si hay varios). No inventes datos que no aparezcan en la imagen.',
    '- Los montos van en números simples (sin separadores), en la moneda del usuario.',
    '- Las fechas van en formato YYYY-MM-DD; hoy es ' + today() + '.',
    '- Responde de forma concisa; resume resultados en una o dos frases.',
    '',
    `Resumen del período (${snapshot.periodLabel ?? ''}):`,
    `- Ingreso mensual: ${money(snapshot.monthlyIncome ?? 0)}; meta de ahorro: ${money(snapshot.savingsGoal ?? 0)}.`,
    `- Disponible del mes: ${money(snapshot.disposable)}; ya gastado: ${money(snapshot.spentThisMonth)}.`,
    `- Te queda: ${money(snapshot.remaining)} para ${snapshot.daysLeft ?? '?'} días (puedes gastar hoy ~${money(snapshot.dailyAllowance)}).`,
    `- Deuda total: ${money(snapshot.totalDebt)}.`,
    `- Top categorías: ${tops}.`,
    snapshot.willOverspend
      ? `- Proyección: a este ritmo terminarás el mes en negativo (${money(snapshot.projectedBalance ?? 0)}).`
      : '',
    'Moneda: ' + c + '.',
  ]
    .filter(Boolean)
    .join('\n');
}
