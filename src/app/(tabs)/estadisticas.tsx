import { useMemo } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, EmptyState, ProgressBar, SectionTitle, Txt } from '@/components/ui';
import { BarChart } from '@/components/bar-chart';
import { CategoryIcon } from '@/components/category-icon';
import { IconBubble } from '@/components/ui';
import {
  useBudgetSnapshot, useCategoryBreakdown, useCategoryMap, useMonthlyExpenseSeries, useTotalDebt,
} from '@/db/hooks';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { formatCurrency } from '@/lib/format';
import { periodLabel } from '@/lib/period';

export default function Estadisticas() {
  const { colors } = useTheme();
  const currency = useSettings((s) => s.settings.currency);
  const snap = useBudgetSnapshot();
  const series = useMonthlyExpenseSeries(6);
  const breakdown = useCategoryBreakdown(snap.range);
  const catMap = useCategoryMap();
  const totalDebt = useTotalDebt();

  const categories = useMemo(() => {
    const totalSpent = breakdown.reduce((s, b) => s + b.total, 0);
    return breakdown
      .map((b) => {
        const cat = catMap.get(b.categoryId ?? -1);
        return {
          name: cat?.name ?? 'Sin categoría',
          icon: cat?.icon ?? 'tag',
          color: cat?.color ?? colors.textFaint,
          total: b.total,
          pct: totalSpent > 0 ? b.total / totalSpent : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [breakdown, catMap, colors.textFaint]);

  const hasData = series.some((s) => s.value > 0) || categories.length > 0;

  return (
    <Screen title="Estadísticas" subtitle={`Análisis de tus finanzas`}>
      {!hasData ? (
        <EmptyState title="Aún no hay datos" subtitle="Registra algunos movimientos y aquí verás tus tendencias." />
      ) : (
        <>
          {/* Gasto por mes */}
          <Card>
            <SectionTitle>Gasto por mes</SectionTitle>
            <BarChart data={series} color={colors.accent} />
          </Card>

          {/* Ingresos vs gastos del período */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, gap: 4 }}>
              <Txt variant="caption" faint>GASTADO · {periodLabel(snap.range)}</Txt>
              <Txt variant="title" style={{ fontSize: 20 }} color={colors.expense}>{formatCurrency(snap.spentThisMonth, currency)}</Txt>
            </Card>
            <Card style={{ flex: 1, gap: 4 }}>
              <Txt variant="caption" faint>DEUDA TOTAL</Txt>
              <Txt variant="title" style={{ fontSize: 20 }} color={totalDebt > 0 ? colors.expense : colors.income}>{formatCurrency(totalDebt, currency)}</Txt>
            </Card>
          </View>

          {/* Desglose por categoría */}
          <Card>
            <SectionTitle>Por categoría</SectionTitle>
            <View style={{ gap: 14 }}>
              {categories.map((c, i) => (
                <View key={i} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <IconBubble color={c.color} size={34}>
                      <CategoryIcon icon={c.icon} color={c.color} size={16} />
                    </IconBubble>
                    <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>{c.name}</Txt>
                    <Txt variant="body">{formatCurrency(c.total, currency)}</Txt>
                  </View>
                  <ProgressBar value={c.pct} color={c.color} height={6} />
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
