/**
 * Fila de transacción reutilizable (Dashboard y Movimientos).
 */
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { Category, Transaction } from '@/db/schema';
import { useTheme } from '@/theme/theme-provider';
import { formatCurrency, relativeDay } from '@/lib/format';
import { CategoryIcon } from './category-icon';
import { IconBubble, Txt } from './ui';

export function TransactionRow({
  tx,
  category,
  currency,
  onPress,
}: {
  tx: Transaction;
  category?: Category;
  currency: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const color = category?.color ?? colors.textFaint;
  const isIncome = tx.type === 'income';

  return (
    <Pressable
      onPress={onPress ?? (() => router.push({ pathname: '/transaction', params: { id: String(tx.id) } }))}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
      <IconBubble color={color}>
        <CategoryIcon icon={category?.icon ?? 'tag'} color={color} size={20} />
      </IconBubble>
      <View style={{ flex: 1 }}>
        <Txt variant="body" numberOfLines={1}>{tx.note || category?.name || 'Movimiento'}</Txt>
        <Txt variant="caption" faint>{category?.name ?? 'Sin categoría'} · {relativeDay(tx.date)}</Txt>
      </View>
      <Txt variant="subtitle" color={isIncome ? colors.income : colors.text}>
        {isIncome ? '+' : '−'}{formatCurrency(tx.amount, currency)}
      </Txt>
    </Pressable>
  );
}
