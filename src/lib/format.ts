/**
 * Formateo de moneda y fechas. Centralizado para mantener consistencia.
 */
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

/**
 * Símbolo por moneda. Lo controlamos nosotros (no dependemos del soporte de
 * símbolos del runtime, que con locale genérico 'es' muestra "COP" en vez de "$").
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', MXN: '$', COP: '$', ARS: '$', CLP: '$', UYU: '$', DOP: '$',
  EUR: '€', BRL: 'R$', GBP: '£', PEN: 'S/', PYG: '₲', BOB: 'Bs',
  VES: 'Bs', CRC: '₡', GTQ: 'Q', HNL: 'L', NIO: 'C$', BZD: '$',
};

function symbolFor(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? '$';
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'es'): string {
  const maxFrac = Number.isInteger(amount) ? 0 : 2;
  const sym = symbolFor(currency);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  try {
    return `${sign}${sym}${new Intl.NumberFormat(locale, { maximumFractionDigits: maxFrac }).format(abs)}`;
  } catch {
    return `${sign}${sym}${abs.toFixed(maxFrac)}`;
  }
}

/** Versión compacta para números grandes: $1.2K, $3.4M. */
export function formatCompact(amount: number, currency = 'USD', locale = 'es'): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sym = symbolFor(currency);
  if (abs >= 1000) {
    try {
      return `${sign}${sym}${new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(abs)}`;
    } catch {
      return formatCurrency(amount, currency, locale);
    }
  }
  return formatCurrency(amount, currency, locale);
}

export const today = () => dayjs().format('YYYY-MM-DD');

export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY');
}

export function formatDateShort(date: string): string {
  return dayjs(date).format('D MMM');
}

/** Etiqueta relativa amigable: Hoy, Ayer, o fecha corta. */
export function relativeDay(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, 'day')) return 'Hoy';
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Ayer';
  return d.format('D MMM');
}

export { dayjs };
