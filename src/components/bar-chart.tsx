/**
 * Gráfico de barras simple. Cada barra CRECE desde abajo con una animación
 * escalonada (Reanimated + easing, sin rebote) al aparecer o cambiar los datos.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme-provider';
import { Txt } from './ui';

export interface Bar {
  label: string;
  value: number;
}

function AnimatedBar({ target, color, radius, delay }: { target: number; color: string; radius: number; delay: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(target, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [target, delay, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: '72%', borderRadius: radius, backgroundColor: color }, style]} />;
}

export function BarChart({ data, height = 140, color }: { data: Bar[]; height?: number; color?: string }) {
  const { colors, radius } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: height + 24 }}>
      {data.map((d, i) => {
        const h = Math.max(d.value > 0 ? 4 : 0, (d.value / max) * height);
        const isMax = d.value === max && d.value > 0;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ height, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
              <AnimatedBar
                target={h}
                delay={i * 70}
                radius={radius.sm}
                color={isMax ? (color ?? colors.accent) : colors.surfaceAlt}
              />
            </View>
            <Txt variant="caption" faint numberOfLines={1}>{d.label}</Txt>
          </View>
        );
      })}
    </View>
  );
}
