import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import { CalendarDays } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { ModalScreen } from '@/components/modal-screen';
import { useConfirm } from '@/components/confirm-dialog';
import { LabeledInput } from '@/components/form';
import { DateStrip } from '@/components/date-strip';
import { CalendarModal } from '@/components/calendar-picker';
import { Button, Card, ProgressBar, Txt } from '@/components/ui';
import { db } from '@/db/client';
import { debts } from '@/db/schema';
import { useLiveDebt } from '@/db/hooks';
import { addDebt, addDebtPayment, deleteDebt, updateDebt } from '@/db/actions';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { formatCurrency, relativeDay, today } from '@/lib/format';

export default function DebtModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const currency = useSettings((s) => s.settings.currency);

  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [amount, setAmount] = useState('');
  const [monthly, setMonthly] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [payment, setPayment] = useState('');
  const [calOpen, setCalOpen] = useState(false);

  const debt = useLiveDebt(editId);

  useEffect(() => {
    if (!editId) return;
    const d = db.select().from(debts).where(eq(debts.id, editId)).get();
    if (d) {
      setName(d.name);
      setCreditor(d.creditor ?? '');
      setAmount(String(d.originalAmount));
      setMonthly(d.monthlyPayment ? String(d.monthlyPayment) : '');
      setDueDate(d.dueDate ?? '');
    }
  }, [editId]);

  const numericAmount = parseFloat(amount || '0') || 0;
  const canSave = name.trim().length > 0 && numericAmount > 0;

  function save() {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const data = {
      name: name.trim(),
      creditor: creditor.trim() || null,
      originalAmount: numericAmount,
      monthlyPayment: parseFloat(monthly || '0') || null,
      dueDate: dueDate || null,
    };
    if (editId) updateDebt(editId, data);
    else addDebt(data);
    router.back();
  }

  function registerPayment() {
    const p = parseFloat(payment || '0') || 0;
    if (!editId || p <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addDebtPayment(editId, p);
    setPayment('');
  }

  const progress = useMemo(() => {
    if (!debt || debt.originalAmount <= 0) return 0;
    return (debt.originalAmount - debt.currentBalance) / debt.originalAmount;
  }, [debt]);

  return (
    <ModalScreen
      title={editId ? 'Deuda' : 'Nueva deuda'}
      onDelete={editId ? async () => {
        if (await confirm({ title: '¿Eliminar deuda?', message: 'También se borrará el historial de pagos de esta deuda.', destructive: true })) {
          deleteDebt(editId);
          router.back();
        }
      } : undefined}
      footer={<Button title={editId ? 'Guardar cambios' : 'Crear deuda'} onPress={save} disabled={!canSave} fullWidth />}>

      {/* Progreso (solo en edición) */}
      {editId && debt ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Txt variant="label" muted>SALDO ACTUAL</Txt>
              <Txt variant="title" color={colors.expense}>{formatCurrency(debt.currentBalance, currency)}</Txt>
            </View>
            <Txt variant="caption" faint>de {formatCurrency(debt.originalAmount, currency)}</Txt>
          </View>
          <ProgressBar value={progress} color={colors.income} />
          <Txt variant="caption" muted>{Math.round(progress * 100)}% pagado</Txt>
        </Card>
      ) : null}

      {/* Registrar pago (solo en edición) */}
      {editId ? (
        <Card style={{ gap: 12 }}>
          <Txt variant="subtitle">Registrar pago</Txt>
          <LabeledInput label="Monto del pago" value={payment} onChangeText={setPayment} placeholder="0" keyboardType="decimal-pad" />
          <Button title="Registrar pago" variant="secondary" onPress={registerPayment} disabled={!(parseFloat(payment || '0') > 0)} fullWidth />
        </Card>
      ) : null}

      {/* Datos de la deuda */}
      <LabeledInput label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Tarjeta de crédito" />
      <LabeledInput label="Acreedor (opcional)" value={creditor} onChangeText={setCreditor} placeholder="Ej. Banco XYZ" />
      <LabeledInput label={editId ? 'Monto original' : 'Monto total'} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />
      <LabeledInput label="Cuota mensual (opcional)" value={monthly} onChangeText={setMonthly} placeholder="0" keyboardType="decimal-pad" />

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="label" muted>Vencimiento (opcional)</Txt>
          <Pressable onPress={() => setCalOpen(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={15} color={colors.accent} />
            <Txt variant="label" color={colors.accent}>{dueDate ? relativeDay(dueDate) : 'Ver calendario'}</Txt>
          </Pressable>
        </View>
        <DateStrip value={dueDate} onChange={setDueDate} />
      </View>

      <CalendarModal
        visible={calOpen}
        onClose={() => setCalOpen(false)}
        value={dueDate}
        onChange={setDueDate}
        minDate={today()}
      />
    </ModalScreen>
  );
}
