import {
  computeBudget,
  computeProjection,
  daysBetween,
  daysLeftInRange,
  totalDebt,
  type BudgetInput,
} from '@/lib/budget';

const range = { start: '2026-06-01', end: '2026-06-30' };

describe('daysBetween', () => {
  it('cuenta días calendario', () => {
    expect(daysBetween('2026-06-01', '2026-06-30')).toBe(29);
    expect(daysBetween('2026-06-10', '2026-06-10')).toBe(0);
  });
});

describe('daysLeftInRange', () => {
  it('incluye hoy y nunca es menor que 1', () => {
    expect(daysLeftInRange('2026-06-30', range)).toBe(1);
    expect(daysLeftInRange('2026-06-21', range)).toBe(10);
    // hoy después del fin → mínimo 1
    expect(daysLeftInRange('2026-07-05', range)).toBe(1);
  });
});

describe('computeBudget', () => {
  const base: BudgetInput = {
    monthlyIncome: 3000,
    savingsGoal: 500,
    fixedTotal: 1000,
    scheduledPendingThisMonth: 200,
    spentThisMonth: 300,
    todayISO: '2026-06-21',
    range,
  };

  it('calcula disponible restando compromisos y ahorro', () => {
    const r = computeBudget(base);
    // 3000 - 1000 - 200 - 500 = 1300
    expect(r.disposable).toBe(1300);
    // 1300 - 300 = 1000
    expect(r.remaining).toBe(1000);
    expect(r.daysLeft).toBe(10);
    // 1000 / 10 = 100 por día
    expect(r.dailyAllowance).toBe(100);
    expect(r.overspent).toBe(false);
  });

  it('marca sobregasto y no muestra permitido diario negativo', () => {
    const r = computeBudget({ ...base, spentThisMonth: 1500 });
    // 1300 - 1500 = -200
    expect(r.remaining).toBe(-200);
    expect(r.overspent).toBe(true);
    expect(r.dailyAllowance).toBe(0);
  });

  it('los programados pendientes reducen el disponible', () => {
    const sin = computeBudget({ ...base, scheduledPendingThisMonth: 0 });
    const con = computeBudget({ ...base, scheduledPendingThisMonth: 400 });
    expect(sin.disposable - con.disposable).toBe(400);
  });
});

describe('computeProjection', () => {
  it('proyecta el gasto a fin de mes según el ritmo', () => {
    const input: BudgetInput = {
      monthlyIncome: 3000,
      savingsGoal: 0,
      fixedTotal: 0,
      scheduledPendingThisMonth: 0,
      spentThisMonth: 210, // en 21 días → 10/día
      todayISO: '2026-06-21',
      range,
    };
    const p = computeProjection(input, 3000);
    expect(p.dailyPace).toBeCloseTo(10, 5);
    // 10/día * 30 días = 300
    expect(p.projectedSpend).toBeCloseTo(300, 5);
    expect(p.projectedBalance).toBeCloseTo(2700, 5);
    expect(p.willOverspend).toBe(false);
  });

  it('detecta que se terminará en negativo', () => {
    const input: BudgetInput = {
      monthlyIncome: 1000,
      savingsGoal: 0,
      fixedTotal: 0,
      scheduledPendingThisMonth: 0,
      spentThisMonth: 700, // en 10 días → 70/día
      todayISO: '2026-06-10',
      range,
    };
    const p = computeProjection(input, 1000);
    // 70/día * 30 = 2100 > 1000
    expect(p.willOverspend).toBe(true);
  });

  it('marca baja confianza en los primeros días del período', () => {
    const input: BudgetInput = {
      monthlyIncome: 3000,
      savingsGoal: 0,
      fixedTotal: 0,
      scheduledPendingThisMonth: 0,
      spentThisMonth: 400,
      todayISO: '2026-06-02', // día 2 → daysElapsed 2 (< 5)
      range,
    };
    expect(computeProjection(input, 3000).lowConfidence).toBe(true);
  });

  it('deja de ser baja confianza a partir del día 5 (borde)', () => {
    const input: BudgetInput = {
      monthlyIncome: 3000,
      savingsGoal: 0,
      fixedTotal: 0,
      scheduledPendingThisMonth: 0,
      spentThisMonth: 400,
      todayISO: '2026-06-05', // día 5 → daysElapsed 5 (no < 5)
      range,
    };
    expect(computeProjection(input, 3000).lowConfidence).toBe(false);
  });
});

describe('totalDebt', () => {
  it('suma saldos pendientes ignorando negativos', () => {
    expect(totalDebt([{ currentBalance: 500 }, { currentBalance: 1200 }])).toBe(1700);
    expect(totalDebt([{ currentBalance: -50 }, { currentBalance: 300 }])).toBe(300);
    expect(totalDebt([])).toBe(0);
  });
});
