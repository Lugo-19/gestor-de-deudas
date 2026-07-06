/**
 * Selector de fecha horizontal: chips de los próximos días. Ideal para elegir
 * el vencimiento de un gasto programado sin depender de un date picker nativo.
 */
import { Pressable, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/theme-provider';
import { dayjs } from '@/lib/format';
import { Txt } from './ui';

export function DateStrip({
  value,
  onChange,
  daysAhead = 60,
}: {
  value: string;
  onChange: (v: string) => void;
  daysAhead?: number;
}) {
  const { colors, radius } = useTheme();
  const days = Array.from({ length: daysAhead }, (_, i) => dayjs().add(i, 'day'));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {days.map((d) => {
        const iso = d.format('YYYY-MM-DD');
        const active = iso === value;
        return (
          <Pressable
            key={iso}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(iso); }}
            style={{
              width: 58,
              paddingVertical: 10,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: active ? colors.accent : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.accent : colors.border,
            }}>
            <Txt variant="caption" color={active ? colors.onAccent : colors.textFaint}>
              {d.format('ddd')}
            </Txt>
            <Txt variant="subtitle" color={active ? colors.onAccent : colors.text}>{d.format('D')}</Txt>
            <Txt variant="caption" color={active ? colors.onAccent : colors.textFaint}>{d.format('MMM')}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
