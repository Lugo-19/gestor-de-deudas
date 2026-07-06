import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Search } from 'lucide-react-native';

import { Card, Divider, EmptyState, Txt } from '@/components/ui';
import { TransactionRow } from '@/components/transaction-row';
import { useCategoryMap, useCurrentPeriod, useTransactions } from '@/db/hooks';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { formatCurrency } from '@/lib/format';
import { periodLabel } from '@/lib/period';

export default function Movimientos() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const currency = useSettings((s) => s.settings.currency);
  const range = useCurrentPeriod();
  const all = useTransactions();
  const catMap = useCategoryMap();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((tx) => {
      const cat = tx.categoryId ? catMap.get(tx.categoryId)?.name ?? '' : '';
      return (tx.note ?? '').toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [all, query, catMap]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const tx of all) {
      if (tx.date < range.start || tx.date > range.end) continue;
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [all, range]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 14 }}>
        <Txt variant="display" style={{ fontSize: 30, lineHeight: 36 }}>Movimientos</Txt>

        {/* Resumen del período */}
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Txt variant="caption" faint>INGRESOS · {periodLabel(range)}</Txt>
            <Txt variant="subtitle" color={colors.income}>{formatCurrency(totals.income, currency)}</Txt>
          </View>
          <Divider />
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="caption" faint>GASTOS · {periodLabel(range)}</Txt>
            <Txt variant="subtitle" color={colors.expense}>{formatCurrency(totals.expense, currency)}</Txt>
          </View>
        </Card>

        {/* Búsqueda */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 46 }}>
          <Search size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nota o categoría"
            placeholderTextColor={colors.textFaint}
            style={{ flex: 1, color: colors.text, fontSize: 15 }}
          />
        </View>
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96 }}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <EmptyState title={query ? 'Sin resultados' : 'Aún no hay movimientos'} subtitle={query ? 'Prueba con otra búsqueda' : 'Toca + para registrar el primero'} />
        }
        renderItem={({ item }) => (
          <TransactionRow tx={item} category={item.categoryId ? catMap.get(item.categoryId) : undefined} currency={currency} />
        )}
      />
    </View>
  );
}
