/**
 * Contenedor para pantallas modales (nueva deuda, gasto programado): cabecera
 * con título, botón cerrar y acción opcional de borrar, cuerpo con scroll.
 */
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';

import { useTheme } from '@/theme/theme-provider';
import { Txt } from './ui';

export function ModalScreen({
  title,
  onDelete,
  children,
  footer,
}: {
  title: string;
  onDelete?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
        <Txt variant="title">{title}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {onDelete ? (
            <Pressable onPress={onDelete} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
              <Trash2 size={20} color={colors.expense} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
            <X size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {footer ? <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 8 }}>{footer}</View> : null}
    </View>
  );
}
