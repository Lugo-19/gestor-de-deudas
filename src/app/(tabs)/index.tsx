import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react-native';

import { Screen } from '@/components/screen';
import { Card, Divider, EmptyState, IconBubble, SectionTitle, Txt } from '@/components/ui';
import { DonutChart } from '@/components/donut-chart';
import { CategoryIcon } from '@/components/category-icon';
import { TransactionRow } from '@/components/transaction-row';
import {
  useBudgetSnapshot, useCategoryBreakdown, useCategoryMap, useRecentTransactions,
  useTotalDebt, useUpcomingPayments,
} from '@/db/hooks';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { formatCurrency, dayjs, formatDateShort } from '@/lib/format';
import { periodLabel } from '@/lib/period';

function greeting(): string {
  const h = dayjs().hour();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const currency = useSettings((s) => s.settings.currency);
  const snap = useBudgetSnapshot();
  const totalDebt = useTotalDebt();
  const upcoming = useUpcomingPayments();
  const breakdown = useCategoryBreakdown(snap.range);
  const recent = useRecentTransactions(5);
  const catMap = useCategoryMap();

  const donut = useMemo(() => {
    return breakdown
      .map((b) => ({ value: b.total, color: catMap.get(b.categoryId ?? -1)?.color ?? colors.textFaint, name: catMap.get(b.categoryId ?? -1)?.name ?? 'Otros' }))
      .sort((a, b) => b.value - a.value);
  }, [breakdown, catMap, colors.textFaint]);

  return (
    <Screen title={greeting()} subtitle={`Tu resumen de ${periodLabel(snap.range).toLowerCase()}`}>
      {/* Hero: puedes gastar hoy */}
      <Card style={{ backgroundColor: colors.accent, borderColor: colors.accent, padding: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={16} color={withAlpha(colors.onAccent, 0.9)} />
          <Txt variant="label" color={withAlpha(colors.onAccent, 0.9)}>PUEDES GASTAR HOY</Txt>
        </View>
        <Txt color={colors.onAccent} style={{ fontSize: 44, fontWeight: '800', letterSpacing: -1 }}>
          {formatCurrency(snap.dailyAllowance, currency)}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {snap.overspent ? (
            <Txt color={withAlpha(colors.onAccent, 0.95)}>
              Te pasaste {formatCurrency(Math.abs(snap.remaining), currency)} este mes
            </Txt>
          ) : (
            <Txt color={withAlpha(colors.onAccent, 0.9)}>
              Te quedan {formatCurrency(snap.remaining, currency)} · {snap.daysLeft} días
            </Txt>
          )}
        </View>
      </Card>

      {/* Stats: disponible + deuda */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MiniStat
          label="Disponible del mes"
          value={formatCurrency(Math.max(0, snap.remaining), currency)}
          tint={colors.income}
          icon={<ArrowUpRight size={16} color={colors.income} />}
        />
        <MiniStat
          label="Debes en total"
          value={formatCurrency(totalDebt, currency)}
          tint={totalDebt > 0 ? colors.expense : colors.textMuted}
          icon={<ArrowDownRight size={16} color={totalDebt > 0 ? colors.expense : colors.textMuted} />}
          onPress={() => router.push('/planificacion')}
        />
      </View>

      {/* Proyección */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {snap.projection.lowConfidence ? (
          <>
            <IconBubble color={colors.textMuted} size={40}>
              <TrendingUp size={20} color={colors.textMuted} />
            </IconBubble>
            <View style={{ flex: 1 }}>
              <Txt variant="label" muted>PROYECCIÓN FIN DE MES</Txt>
              <Txt variant="body" muted style={{ marginTop: 2 }}>
                Aún calculando tu ritmo… vuelve en unos días para ver la proyección.
              </Txt>
            </View>
          </>
        ) : (
          <>
            <IconBubble color={snap.projection.willOverspend ? colors.expense : colors.income} size={40}>
              {snap.projection.willOverspend
                ? <TrendingDown size={20} color={colors.expense} />
                : <TrendingUp size={20} color={colors.income} />}
            </IconBubble>
            <View style={{ flex: 1 }}>
              <Txt variant="label" muted>PROYECCIÓN FIN DE MES</Txt>
              <Txt variant="body" style={{ marginTop: 2 }}>
                {snap.projection.willOverspend
                  ? `A este ritmo te faltarán ${formatCurrency(Math.abs(snap.projection.projectedBalance), currency)}`
                  : `A este ritmo te sobrarán ${formatCurrency(snap.projection.projectedBalance, currency)}`}
              </Txt>
            </View>
          </>
        )}
      </Card>

      {/* Dona por categoría */}
      <Card>
        <SectionTitle right={<Pressable onPress={() => router.push('/estadisticas')}><Txt variant="label" color={colors.accent}>Ver todo</Txt></Pressable>}>
          Gasto por categoría
        </SectionTitle>
        {donut.length === 0 ? (
          <EmptyState title="Sin gastos aún" subtitle="Registra tu primer gasto con el botón +" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <DonutChart
              data={donut}
              center={
                <View style={{ alignItems: 'center' }}>
                  <Txt variant="caption" faint>Gastado</Txt>
                  <Txt variant="subtitle">{formatCurrency(snap.spentThisMonth, currency)}</Txt>
                </View>
              }
            />
            <View style={{ flex: 1, gap: 8 }}>
              {donut.slice(0, 5).map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
                  <Txt variant="caption" style={{ flex: 1 }} numberOfLines={1}>{d.name}</Txt>
                  <Txt variant="caption" muted>{formatCurrency(d.value, currency)}</Txt>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Próximos pagos */}
      {upcoming.length > 0 && (
        <Card>
          <SectionTitle>Próximos pagos</SectionTitle>
          {upcoming.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <IconBubble color={colors.warning} size={40}>
                  <CalendarClock size={18} color={colors.warning} />
                </IconBubble>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" numberOfLines={1}>{s.name}</Txt>
                  <Txt variant="caption" faint>Vence {formatDateShort(s.dueDate)}</Txt>
                </View>
                <Txt variant="subtitle">{formatCurrency(s.amount, currency)}</Txt>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Últimos movimientos */}
      <Card>
        <SectionTitle right={<Pressable onPress={() => router.push('/movimientos')}><ChevronRight size={20} color={colors.textFaint} /></Pressable>}>
          Últimos movimientos
        </SectionTitle>
        {recent.length === 0 ? (
          <EmptyState title="Nada por aquí todavía" subtitle="Toca + para registrar tu primer movimiento" />
        ) : (
          recent.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 && <Divider />}
              <TransactionRow tx={tx} category={tx.categoryId ? catMap.get(tx.categoryId) : undefined} currency={currency} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function MiniStat({ label, value, tint, icon, onPress }: { label: string; value: string; tint: string; icon: React.ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={{ flex: 1 }}>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(tint, 0.16) }}>
            {icon}
          </View>
        </View>
        <Txt variant="title" style={{ fontSize: 20 }} numberOfLines={1}>{value}</Txt>
        <Txt variant="caption" faint>{label}</Txt>
      </Card>
    </Wrapper>
  );
}
