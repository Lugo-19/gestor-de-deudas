/**
 * Kit de primitivas de UI, todas temáticas (leen `useTheme`). Diseño moderno:
 * tarjetas redondeadas, sombras suaves, tipografía jerárquica, acento dinámico.
 */
import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewProps, type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';

// ---------- Texto ----------
type TxtVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';
const TXT: Record<TxtVariant, TextStyle> = {
  display: { fontSize: 40, fontWeight: '800', lineHeight: 46 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subtitle: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 16 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 15 },
};

export function Txt({
  variant = 'body',
  color,
  muted,
  faint,
  style,
  children,
  ...rest
}: TextProps & { variant?: TxtVariant; color?: string; muted?: boolean; faint?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  const resolved = color ?? (faint ? colors.textFaint : muted ? colors.textMuted : colors.text);
  // Si el estilo sobreescribe fontSize pero no lineHeight, calculamos uno proporcional
  // para que los números grandes no se corten ni se encimen.
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const autoLine =
    flat?.fontSize && flat.lineHeight == null
      ? { lineHeight: Math.round(flat.fontSize * 1.18) }
      : null;
  return (
    <Text {...rest} style={[TXT[variant], { color: resolved }, style, autoLine]}>
      {children}
    </Text>
  );
}

// ---------- Card ----------
export function Card({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  const { colors, radius } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...cardShadow(colors.shadow),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function cardShadow(shadow: string): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  })!;
}

// ---------- Botón ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  fullWidth,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}) {
  const { colors, radius } = useTheme();
  const bg =
    variant === 'primary' ? colors.accent
    : variant === 'danger' ? withAlpha(colors.expense, 0.14)
    : variant === 'secondary' ? colors.surfaceAlt
    : 'transparent';
  const fg =
    variant === 'primary' ? colors.onAccent
    : variant === 'danger' ? colors.expense
    : colors.text;

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 52,
          paddingHorizontal: 20,
          borderRadius: radius.md,
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------- Pressable con feedback ----------
export const Touchable = forwardRef<View, PressableProps & { haptic?: boolean }>(
  ({ haptic = true, onPress, style, children, ...rest }, ref) => (
    <Pressable
      ref={ref}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={(state) => [
        { opacity: state.pressed ? 0.7 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {children as ReactNode}
    </Pressable>
  ),
);
Touchable.displayName = 'Touchable';

// ---------- Barra de progreso ----------
export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { colors, radius } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? colors.accent, borderRadius: radius.pill }} />
    </View>
  );
}

// ---------- Icono en círculo ----------
export function IconBubble({ color, size = 44, children }: { color: string; size?: number; children: ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(color, 0.16),
      }}>
      {children}
    </View>
  );
}

// ---------- Títulos de sección ----------
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
      <Txt variant="subtitle">{children}</Txt>
      {right}
    </View>
  );
}

// ---------- Estado vacío ----------
export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
      {icon ? <IconBubble color={colors.accent} size={64}>{icon}</IconBubble> : null}
      <Txt variant="subtitle" style={{ marginTop: 8, textAlign: 'center' }}>{title}</Txt>
      {subtitle ? <Txt muted style={{ textAlign: 'center', paddingHorizontal: 24 }}>{subtitle}</Txt> : null}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}
