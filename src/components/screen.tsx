/**
 * Contenedor de pantalla consistente: fondo temático, safe-area superior,
 * cabecera con título grande y scroll con espacio inferior para la tab bar/FAB.
 */
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/theme-provider';
import { Txt } from './ui';

export function Screen({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  back = false,
  bottomInset = 96,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  back?: boolean;
  bottomInset?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const header = title ? (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
      {back ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ marginBottom: 8, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="display" style={{ fontSize: 30, lineHeight: 36 }}>{title}</Txt>
          {subtitle ? <Txt muted style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
        </View>
        {headerRight}
      </View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset, gap: 16 }}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
      )}
    </View>
  );
}
