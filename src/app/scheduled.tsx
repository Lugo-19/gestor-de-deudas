import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import * as Haptics from 'expo-haptics';

import { ModalScreen } from '@/components/modal-screen';
import { useConfirm } from '@/components/confirm-dialog';
import { LabeledInput } from '@/components/form';
import { DateStrip } from '@/components/date-strip';
import { CalendarModal } from '@/components/calendar-picker';
import { Segmented } from '@/components/segmented';
import { Button, Card, Txt } from '@/components/ui';
import { CategoryIcon } from '@/components/category-icon';
import { CalendarDays } from 'lucide-react-native';
import { db } from '@/db/client';
import { scheduledExpenses } from '@/db/schema';
import { useCategories } from '@/db/hooks';
import { addScheduled, deleteScheduled } from '@/db/actions';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { today, relativeDay } from '@/lib/format';

export default function ScheduledModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const currency = useSettings((s) => s.settings.currency);
  const categories = useCategories('expense');

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(today());
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [reminder, setReminder] = useState(true);
  const [calOpen, setCalOpen] = useState(false);

  useEffect(() => {
    if (!editId) return;
    const s = db.select().from(scheduledExpenses).where(eq(scheduledExpenses.id, editId)).get();
    if (s) {
      setName(s.name);
      setAmount(String(s.amount));
      setCategoryId(s.categoryId);
      setDueDate(s.dueDate);
      setRecurrence(s.recurrence);
      setReminder(s.reminderEnabled);
    }
  }, [editId]);

  const numeric = parseFloat(amount || '0') || 0;
  const canSave = name.trim().length > 0 && numeric > 0 && !!dueDate;

  async function save() {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // En edición, recreamos para reprogramar el recordatorio correctamente.
    if (editId) await deleteScheduled(editId);
    await addScheduled({
      name: name.trim(),
      amount: numeric,
      categoryId,
      dueDate,
      recurrence,
      reminderEnabled: reminder,
      currency,
    });
    router.back();
  }

  return (
    <ModalScreen
      title={editId ? 'Gasto programado' : 'Programar gasto'}
      onDelete={editId ? async () => {
        if (await confirm({ title: '¿Eliminar gasto programado?', message: 'Se cancelará también su recordatorio.', destructive: true })) {
          await deleteScheduled(editId);
          router.back();
        }
      } : undefined}
      footer={<Button title={editId ? 'Guardar cambios' : 'Programar'} onPress={save} disabled={!canSave} fullWidth />}>

      <LabeledInput label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Renta, Netflix, Luz" />
      <LabeledInput label="Monto" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" />

      {/* Categoría (opcional) */}
      <View style={{ gap: 6 }}>
        <Txt variant="label" muted>Categoría (opcional)</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(active ? null : c.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: active ? withAlpha(c.color, 0.16) : colors.surface, borderWidth: 1, borderColor: active ? c.color : colors.border }}>
                <CategoryIcon icon={c.icon} color={c.color} size={16} />
                <Txt variant="label" color={active ? c.color : colors.textMuted}>{c.name}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Vencimiento */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="label" muted>Vencimiento</Txt>
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

      {/* Recurrencia */}
      <View style={{ gap: 6 }}>
        <Txt variant="label" muted>Repetir</Txt>
        <Segmented
          options={[{ value: 'none', label: 'Una vez' }, { value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]}
          value={recurrence}
          onChange={setRecurrence}
        />
      </View>

      {/* Recordatorio */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Txt variant="body">Recordatorio</Txt>
          <Txt variant="caption" faint>Te avisamos el día del vencimiento a las 9:00</Txt>
        </View>
        <Switch value={reminder} onValueChange={setReminder} trackColor={{ true: colors.accent }} />
      </Card>
    </ModalScreen>
  );
}
