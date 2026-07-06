/**
 * Registro de herramientas "tipo MCP": la API interna documentada al alcance de
 * la IA. Cada herramienta declara su nombre, descripción (cuándo usarla) y un
 * esquema JSON de parámetros; el `run` reusa la capa de acciones/lectura ya
 * existente (no se reescribe lógica).
 *
 * - Lectura (`mutates:false`): se ejecutan directo.
 * - Escritura (`mutates:true`): el bucle del agente pide confirmación al usuario
 *   (mostrando `describe(args)`) ANTES de ejecutar `run`.
 */
import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { budgetSettings, categories, debts, scheduledExpenses, transactions } from '@/db/schema';
import {
  addCategory, addDebt, addDebtPayment, addFixedExpense, addScheduled, addTransaction,
  deleteDebt, deleteFixedExpense, deleteScheduled, deleteTransaction, updateDebt,
} from '@/db/actions';
import { buildFinancialSnapshot } from './context';
import { today, formatCurrency } from '@/lib/format';

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema (object) de los parámetros. */
  parameters: Record<string, unknown>;
  /** true si modifica datos (requiere confirmación del usuario). */
  mutates: boolean;
  /** Texto de confirmación en español para herramientas de escritura. */
  describe?: (args: Record<string, any>) => string;
  run: (args: Record<string, any>) => Promise<string> | string;
}

// ---------- Helpers ----------
function currency(): string {
  const s = db.select({ c: budgetSettings.currency }).from(budgetSettings).where(eq(budgetSettings.id, 1)).get();
  return s?.c ?? 'USD';
}
const money = (n: number) => formatCurrency(n, currency());

function num(v: any): number {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function resolveCategoryId(name: any, type?: 'income' | 'expense'): number | null {
  if (name == null || `${name}`.trim() === '') return null;
  const rows = type
    ? db.select().from(categories).where(eq(categories.type, type)).all()
    : db.select().from(categories).all();
  const n = `${name}`.trim().toLowerCase();
  const hit = rows.find((c) => c.name.toLowerCase() === n) ?? rows.find((c) => c.name.toLowerCase().includes(n));
  return hit?.id ?? null;
}

function resolveDebt(ref: any) {
  if (ref == null) return null;
  const asId = Number(ref);
  if (Number.isInteger(asId) && asId > 0) {
    const byId = db.select().from(debts).where(eq(debts.id, asId)).get();
    if (byId) return byId;
  }
  const n = `${ref}`.trim().toLowerCase();
  const all = db.select().from(debts).all();
  return all.find((d) => d.name.toLowerCase() === n) ?? all.find((d) => d.name.toLowerCase().includes(n)) ?? null;
}

const RECURRENCE = ['none', 'weekly', 'monthly'] as const;

// ---------- Herramientas ----------
export const TOOLS: ToolDef[] = [
  // === Lectura ===
  {
    name: 'resumen_financiero',
    description: 'Devuelve el resumen del período: disponible, gastado, restante, deuda total y top categorías. Úsalo si necesitas datos frescos.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    mutates: false,
    run: () => {
      const s = buildFinancialSnapshot();
      const tops = s.topCategories.map((t) => `${t.name}: ${money(t.total)}`).join('; ') || 'sin gastos';
      return [
        `Disponible del mes: ${money(s.disposable)}`,
        `Gastado: ${money(s.spentThisMonth)}`,
        `Restante: ${money(s.remaining)} (${s.daysLeft ?? '?'} días)`,
        `Puedes gastar hoy: ${money(s.dailyAllowance)}`,
        `Deuda total: ${money(s.totalDebt)}`,
        `Top categorías: ${tops}`,
      ].join('\n');
    },
  },
  {
    name: 'listar_movimientos',
    description: 'Lista los últimos movimientos (gastos e ingresos). Útil para revisar o buscar transacciones recientes.',
    parameters: {
      type: 'object',
      properties: {
        limite: { type: 'integer', description: 'Cuántos traer (por defecto 10, máx 30)' },
        tipo: { type: 'string', enum: ['income', 'expense'], description: 'Filtrar por tipo (opcional)' },
      },
      additionalProperties: false,
    },
    mutates: false,
    run: (a) => {
      const limit = Math.min(30, Math.max(1, Number(a?.limite) || 10));
      const where = a?.tipo === 'income' || a?.tipo === 'expense' ? eq(transactions.type, a.tipo) : undefined;
      const rows = db
        .select()
        .from(transactions)
        .where(where)
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(limit)
        .all();
      const catName = new Map(db.select().from(categories).all().map((c) => [c.id, c.name]));
      if (!rows.length) return 'No hay movimientos.';
      return rows
        .map((t) => `#${t.id} ${t.date} ${t.type === 'income' ? '+' : '-'}${money(t.amount)} ${t.categoryId ? catName.get(t.categoryId) ?? '' : ''} ${t.note ?? ''}`.trim())
        .join('\n');
    },
  },
  {
    name: 'listar_deudas',
    description: 'Lista todas las deudas con su saldo actual, monto original, cuota y vencimiento.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    mutates: false,
    run: () => {
      const rows = db.select().from(debts).orderBy(desc(debts.currentBalance)).all();
      if (!rows.length) return 'No hay deudas registradas.';
      return rows
        .map((d) => `#${d.id} ${d.name}${d.creditor ? ` (${d.creditor})` : ''}: saldo ${money(d.currentBalance)} de ${money(d.originalAmount)}${d.monthlyPayment ? `, cuota ${money(d.monthlyPayment)}` : ''}${d.dueDate ? `, vence ${d.dueDate}` : ''}`)
        .join('\n');
    },
  },
  {
    name: 'listar_programados',
    description: 'Lista los gastos programados pendientes (nombre, monto, vencimiento, recurrencia).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    mutates: false,
    run: () => {
      const rows = db.select().from(scheduledExpenses).where(eq(scheduledExpenses.isPaid, false)).orderBy(scheduledExpenses.dueDate).all();
      if (!rows.length) return 'No hay gastos programados.';
      return rows.map((s) => `#${s.id} ${s.name}: ${money(s.amount)}, vence ${s.dueDate}, ${s.recurrence}`).join('\n');
    },
  },
  {
    name: 'listar_categorias',
    description: 'Lista las categorías disponibles. Úsalo para saber a qué categoría asignar un movimiento.',
    parameters: {
      type: 'object',
      properties: { tipo: { type: 'string', enum: ['income', 'expense'] } },
      additionalProperties: false,
    },
    mutates: false,
    run: (a) => {
      const where = a?.tipo === 'income' || a?.tipo === 'expense' ? eq(categories.type, a.tipo) : undefined;
      const rows = db.select().from(categories).where(where).all();
      return rows.map((c) => `${c.name} (${c.type})`).join(', ') || 'Sin categorías.';
    },
  },

  // === Escritura ===
  {
    name: 'registrar_movimiento',
    description: 'Registra un gasto o ingreso. Resuelve la categoría por nombre.',
    parameters: {
      type: 'object',
      properties: {
        monto: { type: 'number', description: 'Monto positivo' },
        tipo: { type: 'string', enum: ['income', 'expense'] },
        categoria: { type: 'string', description: 'Nombre de la categoría (opcional)' },
        nota: { type: 'string' },
        fecha: { type: 'string', description: 'YYYY-MM-DD; por defecto hoy' },
      },
      required: ['monto', 'tipo'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => `Registrar ${a.tipo === 'income' ? 'ingreso' : 'gasto'} de ${money(num(a.monto))}${a.categoria ? ` en ${a.categoria}` : ''}${a.nota ? ` (${a.nota})` : ''}`,
    run: (a) => {
      const amount = num(a.monto);
      if (!(amount > 0)) return 'Error: el monto debe ser mayor que 0.';
      const type = a.tipo === 'income' ? 'income' : 'expense';
      addTransaction({
        amount,
        type,
        categoryId: resolveCategoryId(a.categoria, type),
        date: a.fecha || today(),
        note: a.nota?.trim() || null,
      });
      return `Movimiento registrado: ${type === 'income' ? '+' : '-'}${money(amount)}.`;
    },
  },
  {
    name: 'agregar_deuda',
    description: 'Crea una nueva deuda. El saldo inicial es igual al monto total.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        monto: { type: 'number', description: 'Monto total de la deuda' },
        acreedor: { type: 'string' },
        cuotaMensual: { type: 'number' },
        vencimiento: { type: 'string', description: 'YYYY-MM-DD (opcional)' },
      },
      required: ['nombre', 'monto'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => `Añadir deuda «${a.nombre}» por ${money(num(a.monto))}${a.acreedor ? ` con ${a.acreedor}` : ''}`,
    run: (a) => {
      const originalAmount = num(a.monto);
      if (!a.nombre?.trim()) return 'Error: falta el nombre de la deuda.';
      if (!(originalAmount > 0)) return 'Error: el monto debe ser mayor que 0.';
      addDebt({
        name: a.nombre.trim(),
        creditor: a.acreedor?.trim() || null,
        originalAmount,
        monthlyPayment: a.cuotaMensual != null ? num(a.cuotaMensual) : null,
        dueDate: a.vencimiento || null,
      });
      return `Deuda «${a.nombre.trim()}» creada por ${money(originalAmount)}.`;
    },
  },
  {
    name: 'registrar_pago_deuda',
    description: 'Registra un pago a una deuda (reduce su saldo y crea un gasto). Identifica la deuda por nombre o id.',
    parameters: {
      type: 'object',
      properties: {
        deuda: { type: 'string', description: 'Nombre o id de la deuda' },
        monto: { type: 'number' },
        fecha: { type: 'string', description: 'YYYY-MM-DD; por defecto hoy' },
      },
      required: ['deuda', 'monto'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => {
      const d = resolveDebt(a.deuda);
      return `Registrar pago de ${money(num(a.monto))} a la deuda «${d?.name ?? a.deuda}»`;
    },
    run: (a) => {
      const d = resolveDebt(a.deuda);
      if (!d) return `Error: no encontré la deuda "${a.deuda}".`;
      const amount = num(a.monto);
      if (!(amount > 0)) return 'Error: el monto del pago debe ser mayor que 0.';
      addDebtPayment(d.id, amount, a.fecha || today());
      return `Pago de ${money(amount)} registrado a «${d.name}».`;
    },
  },
  {
    name: 'actualizar_deuda',
    description: 'Modifica datos de una deuda existente (nombre, acreedor, cuota mensual, vencimiento). Identifícala por nombre o id.',
    parameters: {
      type: 'object',
      properties: {
        deuda: { type: 'string' },
        nombre: { type: 'string' },
        acreedor: { type: 'string' },
        cuotaMensual: { type: 'number' },
        vencimiento: { type: 'string' },
      },
      required: ['deuda'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => {
      const d = resolveDebt(a.deuda);
      return `Actualizar la deuda «${d?.name ?? a.deuda}»`;
    },
    run: (a) => {
      const d = resolveDebt(a.deuda);
      if (!d) return `Error: no encontré la deuda "${a.deuda}".`;
      const patch: Record<string, any> = {};
      if (a.nombre?.trim()) patch.name = a.nombre.trim();
      if (a.acreedor !== undefined) patch.creditor = a.acreedor?.trim() || null;
      if (a.cuotaMensual !== undefined) patch.monthlyPayment = a.cuotaMensual != null ? num(a.cuotaMensual) : null;
      if (a.vencimiento !== undefined) patch.dueDate = a.vencimiento || null;
      if (!Object.keys(patch).length) return 'Nada que actualizar.';
      updateDebt(d.id, patch);
      return `Deuda «${d.name}» actualizada.`;
    },
  },
  {
    name: 'programar_gasto',
    description: 'Programa un gasto futuro con recordatorio opcional. Recurrencia: none, weekly o monthly.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        monto: { type: 'number' },
        vencimiento: { type: 'string', description: 'YYYY-MM-DD' },
        recurrencia: { type: 'string', enum: ['none', 'weekly', 'monthly'] },
        categoria: { type: 'string' },
        recordatorio: { type: 'boolean' },
      },
      required: ['nombre', 'monto', 'vencimiento'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => `Programar «${a.nombre}» por ${money(num(a.monto))} para el ${a.vencimiento}`,
    run: async (a) => {
      const amount = num(a.monto);
      if (!a.nombre?.trim()) return 'Error: falta el nombre.';
      if (!(amount > 0)) return 'Error: el monto debe ser mayor que 0.';
      if (!a.vencimiento) return 'Error: falta el vencimiento (YYYY-MM-DD).';
      const recurrence = (RECURRENCE as readonly string[]).includes(a.recurrencia) ? a.recurrencia : 'none';
      await addScheduled({
        name: a.nombre.trim(),
        amount,
        categoryId: resolveCategoryId(a.categoria, 'expense'),
        dueDate: a.vencimiento,
        recurrence,
        reminderEnabled: a.recordatorio !== false,
        currency: currency(),
      });
      return `Gasto «${a.nombre.trim()}» programado para el ${a.vencimiento}.`;
    },
  },
  {
    name: 'agregar_gasto_fijo',
    description: 'Añade un gasto fijo mensual (renta, servicios…) que se reserva del presupuesto.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        monto: { type: 'number' },
        diaDelMes: { type: 'integer', description: '1-28 (opcional)' },
      },
      required: ['nombre', 'monto'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => `Añadir gasto fijo «${a.nombre}» de ${money(num(a.monto))}`,
    run: (a) => {
      const amount = num(a.monto);
      if (!a.nombre?.trim()) return 'Error: falta el nombre.';
      if (!(amount > 0)) return 'Error: el monto debe ser mayor que 0.';
      addFixedExpense({ name: a.nombre.trim(), amount, dayOfMonth: Math.min(28, Math.max(1, Number(a.diaDelMes) || 1)) });
      return `Gasto fijo «${a.nombre.trim()}» de ${money(amount)} añadido.`;
    },
  },
  {
    name: 'crear_categoria',
    description: 'Crea una categoría nueva de gasto o ingreso.',
    parameters: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        tipo: { type: 'string', enum: ['income', 'expense'] },
        icono: { type: 'string', description: 'Clave de icono (opcional)' },
        color: { type: 'string', description: 'Hex #RRGGBB (opcional)' },
      },
      required: ['nombre', 'tipo'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => `Crear categoría «${a.nombre}» (${a.tipo === 'income' ? 'ingreso' : 'gasto'})`,
    run: (a) => {
      if (!a.nombre?.trim()) return 'Error: falta el nombre.';
      const type = a.tipo === 'income' ? 'income' : 'expense';
      addCategory({ name: a.nombre.trim(), icon: a.icono?.trim() || 'tag', color: a.color?.trim() || '#7C5CFC', type });
      return `Categoría «${a.nombre.trim()}» creada.`;
    },
  },
  {
    name: 'eliminar_deuda',
    description: 'Elimina una deuda y su historial de pagos. Identifícala por nombre o id.',
    parameters: {
      type: 'object',
      properties: { deuda: { type: 'string' } },
      required: ['deuda'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => {
      const d = resolveDebt(a.deuda);
      return `Eliminar la deuda «${d?.name ?? a.deuda}» y su historial de pagos`;
    },
    run: (a) => {
      const d = resolveDebt(a.deuda);
      if (!d) return `Error: no encontré la deuda "${a.deuda}".`;
      deleteDebt(d.id);
      return `Deuda «${d.name}» eliminada.`;
    },
  },
  {
    name: 'eliminar_movimiento',
    description: 'Elimina un movimiento por su id (obtén el id con listar_movimientos).',
    parameters: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      required: ['id'],
      additionalProperties: false,
    },
    mutates: true,
    describe: (a) => `Eliminar el movimiento #${a.id}`,
    run: (a) => {
      const id = Number(a.id);
      if (!Number.isInteger(id)) return 'Error: id inválido.';
      const row = db.select().from(transactions).where(eq(transactions.id, id)).get();
      if (!row) return `Error: no existe el movimiento #${id}.`;
      deleteTransaction(id);
      return `Movimiento #${id} eliminado.`;
    },
  },
];

export function getTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}
