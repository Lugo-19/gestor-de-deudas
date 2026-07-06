/**
 * Proveedor de tema. Resuelve el esquema efectivo (claro/oscuro) combinando la
 * preferencia del usuario (`themeMode`) con el esquema del sistema, y aplica el
 * color de acento elegido. Todo cambio en el store se refleja al instante.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';
import { buildTheme, type Scheme, type Theme } from './palette';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettings((s) => s.settings.themeMode);
  const accent = useSettings((s) => s.settings.accentColor);

  const scheme: Scheme = useMemo(() => {
    if (themeMode === 'light' || themeMode === 'dark') return themeMode;
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [themeMode, systemScheme]);

  const theme = useMemo(() => buildTheme(scheme, accent), [scheme, accent]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return theme;
}
