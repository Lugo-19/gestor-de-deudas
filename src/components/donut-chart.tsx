/**
 * Dona de gasto por categoría (react-native-svg). Los segmentos se DIBUJAN con
 * una animación de barrido (Reanimated + easing, sin rebote) al aparecer o al
 * cambiar los datos.
 */
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  Easing, useAnimatedProps, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme-provider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSegment {
  value: number;
  color: string;
}

function Segment({
  size, radius, strokeWidth, color, dash, offset, circumference, progress,
}: {
  size: number; radius: number; strokeWidth: number; color: string;
  dash: number; offset: number; circumference: number;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const d = dash * progress.value;
    return {
      strokeDasharray: [d, circumference - d] as unknown as string,
      strokeDashoffset: -offset * progress.value,
    };
  });
  return (
    <AnimatedCircle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

export function DonutChart({
  data,
  size = 180,
  strokeWidth = 22,
  center,
}: {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  center?: ReactNode;
}) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, [total, data.length, progress]);

  let offset = 0;
  const segments = total > 0
    ? data
        .filter((d) => d.value > 0)
        .map((d, i) => {
          const fraction = d.value / total;
          const dash = fraction * circumference;
          const seg = (
            <Segment
              key={i}
              size={size}
              radius={radius}
              strokeWidth={strokeWidth}
              color={d.color}
              dash={dash}
              offset={offset}
              circumference={circumference}
              progress={progress}
            />
          );
          offset += dash;
          return seg;
        })
    : null;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
          {segments}
        </G>
      </Svg>
      {center ? (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{center}</View>
      ) : null}
    </View>
  );
}
