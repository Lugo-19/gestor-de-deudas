/**
 * Sistema de tema propio (sin NativeWind) para soportar:
 *  - Modo claro / oscuro / automático.
 *  - Color de acento personalizable en tiempo real.
 *
 * `buildTheme(scheme, accent)` devuelve un objeto de tokens semánticos que
 * consumen todas las pantallas vía `useTheme()`.
 */

export type Scheme = 'light' | 'dark';
export type ThemeMode = 'system' | 'light' | 'dark';

/** Presets de color de acento (bonitos y modernos). El usuario también puede elegir uno propio. */
export const ACCENT_PRESETS = [
  { name: 'Violeta', value: '#7C5CFC' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Océano', value: '#0EA5E9' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Coral', value: '#FB7185' },
  { name: 'Ámbar', value: '#F59E0B' },
  { name: 'Menta', value: '#14B8A6' },
  { name: 'Rosa', value: '#EC4899' },
] as const;

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].value; // Violeta

/** Añade opacidad (0..1) a un color hex de 6 dígitos → devuelve #RRGGBBAA. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.slice(0, 6);
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${full}${a}`;
}

/** Devuelve blanco o negro según el contraste del color de fondo (para texto sobre el acento). */
export function contrastText(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // luminancia relativa aproximada
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0B0D12' : '#FFFFFF';
}

const LIGHT = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F4',
  surfaceElevated: '#FFFFFF',
  border: '#E5E8EE',
  text: '#0B0D12',
  textMuted: '#5A6472',
  textFaint: '#9AA3B2',
  income: '#12A150',
  expense: '#E5484D',
  warning: '#F59E0B',
  shadow: '#0B0D12',
};

const DARK = {
  bg: '#0B0D12',
  surface: '#15181F',
  surfaceAlt: '#1D212A',
  surfaceElevated: '#1A1E26',
  border: '#272C36',
  text: '#F4F6FA',
  textMuted: '#9AA3B2',
  textFaint: '#616B7A',
  income: '#3DD68C',
  expense: '#FF6369',
  warning: '#FBBF24',
  shadow: '#000000',
};

export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export type ThemeColors = typeof LIGHT & {
  accent: string;
  accentSoft: string;
  accentMuted: string;
  onAccent: string;
};

export interface Theme {
  scheme: Scheme;
  colors: ThemeColors;
  radius: typeof RADIUS;
  spacing: typeof SPACING;
}

export function buildTheme(scheme: Scheme, accent: string): Theme {
  const base = scheme === 'dark' ? DARK : LIGHT;
  return {
    scheme,
    radius: RADIUS,
    spacing: SPACING,
    colors: {
      ...base,
      accent,
      accentSoft: withAlpha(accent, scheme === 'dark' ? 0.18 : 0.12),
      accentMuted: withAlpha(accent, scheme === 'dark' ? 0.32 : 0.2),
      onAccent: contrastText(accent),
    },
  };
}
