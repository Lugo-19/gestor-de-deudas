/**
 * Cálculo del período presupuestario actual. Por defecto es el mes natural,
 * pero respeta `monthStartDay` por si el usuario cobra, p. ej., el día 25.
 */
import { dayjs } from './format';
import type { MonthRange } from './budget';

export function getCurrentPeriod(monthStartDay = 1, ref = dayjs()): MonthRange {
  const day = Math.min(Math.max(1, monthStartDay), 28);
  let start = ref.date(day);
  if (ref.date() < day) {
    start = start.subtract(1, 'month');
  }
  const end = start.add(1, 'month').subtract(1, 'day');
  return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
}

/** Etiqueta legible del período, p. ej. "Junio". */
export function periodLabel(range: MonthRange): string {
  const start = dayjs(range.start);
  const label = start.format('MMMM');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
