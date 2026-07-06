/**
 * Control segmentado temático (toggle Gasto/Ingreso, vistas Deudas/Programados).
 */
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/theme-provider';
import { Txt } from './ui';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  activeColor,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeColor?: string;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(opt.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? (activeColor ?? colors.accent) : 'transparent',
            }}>
            <Txt variant="label" color={active ? (activeColor ? '#fff' : colors.onAccent) : colors.textMuted}>
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
