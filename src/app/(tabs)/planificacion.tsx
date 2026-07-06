import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, CheckCircle2, CreditCard, Plus } from 'lucide-react-native';

import { Screen } from '@/components/screen';
import { Button, Card, EmptyState, IconBubble, ProgressBar, Txt } from '@/components/ui';
import { Segmented } from '@/components/segmented';
import { useDebts, useScheduled, useTotalDebt } from '@/db/hooks';
import { markScheduledPaid } from '@/db/actions';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { formatCurrency, formatDate } from '@/lib/format';

export default function Planificacion() {
  const [view, setView] = useState<'debts' | 'scheduled'>('debts');
  return (
    <Screen title="Planificación">
      <Segmented
        options={[{ value: 'debts', label: 'Deudas' }, { value: 'scheduled', label: 'Programados' }]}
        value={view}
        onChange={setView}
      />
      {view === 'debts' ? <DebtsView /> : <ScheduledView />}
    </Screen>
  );
}

function DebtsView() {
  const { colors } = useTheme();
  const router = useRouter();
  const currency = useSettings((s) => s.settings.currency);
  const debts = useDebts();
  const total = useTotalDebt();

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ backgroundColor: total > 0 ? colors.expense : colors.surface, borderColor: total > 0 ? colors.expense : colors.border }}>
        <Txt variant="label" color={total > 0 ? '#fff' : colors.textMuted}>DEBES EN TOTAL</Txt>
        <Txt style={{ fontSize: 34, fontWeight: '800' }} color={total > 0 ? '#fff' : colors.text}>
          {formatCurrency(total, currency)}
        </Txt>
      </Card>

      <Button title="Añadir deuda" icon={<Plus size={18} color={colors.onAccent} />} onPress={() => router.push('/debt')} fullWidth />

      {debts.length === 0 ? (
        <EmptyState icon={<CreditCard size={28} color={colors.accent} />} title="Sin deudas registradas" subtitle="Lleva el control de a quién le debes y cuánto." />
      ) : (
        debts.map((d) => {
          const paid = d.originalAmount - d.currentBalance;
          const progress = d.originalAmount > 0 ? paid / d.originalAmount : 0;
          return (
            <Pressable key={d.id} onPress={() => router.push({ pathname: '/debt', params: { id: String(d.id) } })}>
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="subtitle" numberOfLines={1}>{d.name}</Txt>
                    {d.creditor ? <Txt variant="caption" faint>{d.creditor}</Txt> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="subtitle" color={colors.expense}>{formatCurrency(d.currentBalance, currency)}</Txt>
                    <Txt variant="caption" faint>de {formatCurrency(d.originalAmount, currency)}</Txt>
                  </View>
                </View>
                <ProgressBar value={progress} color={colors.income} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt variant="caption" muted>{Math.round(progress * 100)}% pagado</Txt>
                  {d.dueDate ? <Txt variant="caption" faint>Vence {formatDate(d.dueDate)}</Txt> : null}
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

function ScheduledView() {
  const { colors } = useTheme();
  const router = useRouter();
  const currency = useSettings((s) => s.settings.currency);
  const scheduled = useScheduled();

  return (
    <View style={{ gap: 14 }}>
      <Button title="Programar gasto" icon={<Plus size={18} color={colors.onAccent} />} onPress={() => router.push('/scheduled')} fullWidth />

      {scheduled.length === 0 ? (
        <EmptyState icon={<CalendarClock size={28} color={colors.accent} />} title="Sin gastos programados" subtitle="Planifica pagos futuros y recibe un recordatorio." />
      ) : (
        scheduled.map((s) => (
          <Card key={s.id} style={{ gap: 12 }}>
            <Pressable onPress={() => router.push({ pathname: '/scheduled', params: { id: String(s.id) } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBubble color={colors.warning}>
                <CalendarClock size={20} color={colors.warning} />
              </IconBubble>
              <View style={{ flex: 1 }}>
                <Txt variant="body" numberOfLines={1}>{s.name}</Txt>
                <Txt variant="caption" faint>
                  Vence {formatDate(s.dueDate)}{s.recurrence !== 'none' ? ` · ${s.recurrence === 'monthly' ? 'Mensual' : 'Semanal'}` : ''}
                </Txt>
              </View>
              <Txt variant="subtitle">{formatCurrency(s.amount, currency)}</Txt>
            </Pressable>
            <Button
              title="Marcar como pagado"
              variant="secondary"
              icon={<CheckCircle2 size={18} color={colors.income} />}
              onPress={() => markScheduledPaid(s.id, currency)}
              fullWidth
            />
          </Card>
        ))
      )}
    </View>
  );
}
