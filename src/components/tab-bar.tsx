/**
 * Barra de pestañas flotante y moderna: pastilla de acento en la pestaña activa
 * (sin morphing de ancho, para que el texto no se deforme), iconos Lucide y FAB.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChartPie, House, Plus, Settings, Sparkles, WalletCards, CalendarClock, type LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { Txt, cardShadow } from './ui';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Inicio', icon: House },
  movimientos: { label: 'Movimientos', icon: WalletCards },
  planificacion: { label: 'Plan', icon: CalendarClock },
  estadisticas: { label: 'Análisis', icon: ChartPie },
  asistente: { label: 'Asistente', icon: Sparkles },
  ajustes: { label: 'Ajustes', icon: Settings },
};

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** true mientras el teclado está visible (para ocultar la barra al escribir). */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

export function TabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  // Al escribir, la barra estorba y ocupa espacio: la ocultamos.
  if (keyboardVisible) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom > 0 ? insets.bottom : 14, paddingTop: 8, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: 26,
          height: 62,
          alignItems: 'center',
          paddingHorizontal: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...cardShadow(colors.shadow),
        }}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const Icon = tab.icon;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ pressed }) => ({
                flexGrow: focused ? 0 : 1,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 40,
                  paddingHorizontal: focused ? 14 : 8,
                  // Radio concreto (~mitad de la altura) en vez de 999: en Android
                  // un radio enorme sobre una vista que cambia de tamaño al navegar
                  // a veces queda cuadrado. overflow:'hidden' fuerza el recorte.
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: focused ? withAlpha(colors.accent, 0.16) : 'transparent',
                }}>
                <Icon size={22} color={focused ? colors.accent : colors.textFaint} strokeWidth={focused ? 2.5 : 2} />
                {focused ? (
                  <Txt style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
                    {tab.label}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Botón flotante "+" para registrar un gasto desde cualquier pestaña. */
export function AddFab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        router.push('/transaction');
      }}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom: (insets.bottom > 0 ? insets.bottom : 14) + 84,
        width: 62,
        height: 62,
        borderRadius: 31,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        opacity: pressed ? 0.9 : 1,
        ...cardShadow(colors.accent),
      })}>
      <Plus size={30} color={colors.onAccent} strokeWidth={2.6} />
    </Pressable>
  );
}
