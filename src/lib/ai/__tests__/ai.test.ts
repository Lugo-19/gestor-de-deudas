/**
 * Tests de la fundación de IA (Fase A). Se mockea la capa de BD para no
 * depender de SQLite nativo: se valida la INTEGRIDAD del registro de
 * herramientas, las validaciones de escritura y el armado del system prompt.
 */

// db mockeada: cadena Drizzle que devuelve undefined en .get() y [] en .all().
jest.mock('@/db/client', () => {
  const chain: any = new Proxy(() => chain, {
    get: (_t, prop) => {
      if (prop === 'get') return () => undefined;
      if (prop === 'all') return () => [];
      return chain;
    },
    apply: () => chain,
  });
  return { db: chain, DB_NAME: 'test.db', initSchema: () => {}, expoDb: {} };
});

// Acciones mockeadas: espías que registran llamadas.
jest.mock('@/db/actions', () => ({
  addTransaction: jest.fn(),
  addDebt: jest.fn(),
  addDebtPayment: jest.fn(),
  addFixedExpense: jest.fn(),
  addScheduled: jest.fn(),
  addCategory: jest.fn(),
  updateDebt: jest.fn(),
  deleteDebt: jest.fn(),
  deleteFixedExpense: jest.fn(),
  deleteScheduled: jest.fn(),
  deleteTransaction: jest.fn(),
}));

import { TOOLS, getTool } from '@/lib/ai/tools';
import { addTransaction, addDebt } from '@/db/actions';
import { buildSystemPrompt } from '@/lib/ai/context';
import type { FinancialSnapshot } from '@/lib/ai/advisor';

describe('registro de herramientas', () => {
  it('cada herramienta está bien formada', () => {
    expect(TOOLS.length).toBeGreaterThan(0);
    for (const t of TOOLS) {
      expect(typeof t.name).toBe('string');
      // Los proveedores (Claude/Gemini/OpenAI) exigen nombres ASCII.
      expect(t.name).toMatch(/^[a-z0-9_]+$/);
      expect(typeof t.description).toBe('string');
      expect(t.parameters).toMatchObject({ type: 'object' });
      expect(typeof t.run).toBe('function');
      expect(typeof t.mutates).toBe('boolean');
    }
  });

  it('las herramientas de escritura declaran describe()', () => {
    for (const t of TOOLS.filter((t) => t.mutates)) {
      expect(typeof t.describe).toBe('function');
    }
  });

  it('los nombres son únicos y getTool los resuelve', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(getTool('registrar_movimiento')?.name).toBe('registrar_movimiento');
    expect(getTool('inexistente')).toBeUndefined();
  });
});

describe('validaciones de escritura', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registrar_movimiento rechaza monto inválido y no toca la BD', async () => {
    const out = await getTool('registrar_movimiento')!.run({ tipo: 'expense' });
    expect(out).toMatch(/Error/i);
    expect(addTransaction).not.toHaveBeenCalled();
  });

  it('registrar_movimiento con datos válidos llama a addTransaction', async () => {
    const out = await getTool('registrar_movimiento')!.run({ monto: 50, tipo: 'expense', nota: 'café' });
    expect(addTransaction).toHaveBeenCalledTimes(1);
    expect(out).toMatch(/registrado/i);
  });

  it('agregar_deuda exige nombre', async () => {
    const out = await getTool('agregar_deuda')!.run({ monto: 1000 });
    expect(out).toMatch(/Error/i);
    expect(addDebt).not.toHaveBeenCalled();
  });

  it('describe() de agregar_deuda produce texto de confirmación', () => {
    const txt = getTool('agregar_deuda')!.describe!({ nombre: 'Moto', monto: 8000000 });
    expect(txt).toMatch(/Moto/);
  });
});

describe('buildSystemPrompt', () => {
  const snap: FinancialSnapshot = {
    disposable: 1300,
    remaining: 1000,
    spentThisMonth: 300,
    dailyAllowance: 100,
    totalDebt: 500,
    topCategories: [{ name: 'Comida', total: 200 }],
    currency: 'USD',
    daysLeft: 10,
    monthlyIncome: 3000,
    savingsGoal: 500,
    periodLabel: 'Junio',
  };

  it('incluye las cifras clave y menciona al asistente', () => {
    const p = buildSystemPrompt(snap);
    expect(p).toMatch(/asistente/i);
    // Tolerante al separador de miles (jest sin full-ICU no agrupa).
    expect(p).toMatch(/\$1[.,]?300/);
    expect(p).toContain('Comida');
    expect(p).toContain('USD');
  });
});
