import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import { AlertTriangle, CalendarDays, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Button, Divider, Txt } from '@/components/ui';
import { Segmented } from '@/components/segmented';
import { AmountKeypad } from '@/components/amount-keypad';
import { CategoryPicker } from '@/components/category-picker';
import { CalendarModal } from '@/components/calendar-picker';
import { useConfirm } from '@/components/confirm-dialog';
import { db } from '@/db/client';
import { transactions } from '@/db/schema';
import { useCategories, useFixedExpenses } from '@/db/hooks';
import { addTransaction, deleteTransaction, updateTransaction } from '@/db/actions';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { formatCurrency, today, dayjs, relativeDay } from '@/lib/format';

export default function TransactionModal() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const currency = useSettings((s) => s.settings.currency);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [calOpen, setCalOpen] = useState(false);

  const categories = useCategories(type);
  const fixed = useFixedExpenses();

  // Cargar datos si es edición.
  useEffect(() => {
    if (!editId) return;
    const tx = db.select().from(transactions).where(eq(transactions.id, editId)).get();
    if (tx) {
      setType(tx.type);
      setAmount(String(tx.amount));
      setCategoryId(tx.categoryId);
      setNote(tx.note ?? '');
      setDate(tx.date);
    }
  }, [editId]);

  // Selecciona la primera categoría por defecto al cambiar de tipo.
  useEffect(() => {
    if (categoryId == null && categories.length) setCategoryId(categories[0].id);
    if (categoryId != null && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? null);
    }
  }, [categories, categoryId]);

  const numeric = useMemo(() => parseFloat(amount || '0') || 0, [amount]);
  const canSave = numeric > 0 && categoryId != null;

  // Aviso (no bloqueante) si el gasto parece un gasto fijo ya reservado.
  const fixedMatch = useMemo(() => {
    if (type !== 'expense' || numeric <= 0) return null;
    const noteLc = note.trim().toLowerCase();
    return (
      fixed.find((f) => {
        const amountClose = Math.abs(f.amount - numeric) < 0.01 || Math.abs(f.amount - numeric) / f.amount <= 0.02;
        const nameLc = f.name.toLowerCase();
        const nameHit = noteLc.length >= 3 && (nameLc.includes(noteLc) || noteLc.includes(nameLc));
        return amountClose || nameHit;
      }) ?? null
    );
  }, [type, numeric, note, fixed]);

  function save() {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const payload = { amount: numeric, type, categoryId, note: note.trim() || null, date };
    if (editId) updateTransaction(editId, payload);
    else addTransaction(payload);
    router.back();
  }

  const dayChips: { label: string; value: string }[] = [
    { label: 'Hoy', value: today() },
    { label: 'Ayer', value: dayjs().subtract(1, 'day').format('YYYY-MM-DD') },
    { label: 'Antier', value: dayjs().subtract(2, 'day').format('YYYY-MM-DD') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      {/* Cabecera */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
        <Txt variant="title">{editId ? 'Editar' : 'Nuevo'} movimiento</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editId ? (
            <Pressable
              onPress={async () => {
                if (await confirm({ title: '¿Eliminar movimiento?', message: 'Esta acción no se puede deshacer.', destructive: true })) {
                  deleteTransaction(editId);
                  router.back();
                }
              }}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
              <Trash2 size={20} color={colors.expense} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
            <X size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 14, flex: 1 }}>
        <Segmented
          options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]}
          value={type}
          onChange={setType}
          activeColor={type === 'income' ? colors.income : colors.expense}
        />

        {/* Monto grande */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Txt style={{ fontSize: 46, fontWeight: '800', color: numeric > 0 ? colors.text : colors.textFaint }}>
            {formatCurrency(numeric, currency)}
          </Txt>
        </View>

        {/* Categorías */}
        <View style={{ flex: 1 }}>
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
        </View>

        {/* Nota + fecha */}
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Nota (opcional)"
          placeholderTextColor={colors.textFaint}
          style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 48, color: colors.text }}
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {dayChips.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => setDate(c.value)}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: date === c.value ? colors.accent : colors.surfaceAlt }}>
              <Txt variant="label" color={date === c.value ? colors.onAccent : colors.textMuted}>{c.label}</Txt>
            </Pressable>
          ))}
          {(() => {
            const isCustom = !dayChips.some((c) => c.value === date);
            return (
              <Pressable
                onPress={() => setCalOpen(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: isCustom ? colors.accent : colors.surfaceAlt }}>
                <CalendarDays size={15} color={isCustom ? colors.onAccent : colors.textMuted} />
                <Txt variant="label" color={isCustom ? colors.onAccent : colors.textMuted}>
                  {isCustom ? relativeDay(date) : 'Otra fecha'}
                </Txt>
              </Pressable>
            );
          })()}
        </View>

        {/* Aviso: parece un gasto fijo ya reservado */}
        {fixedMatch ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: withAlpha(colors.warning, 0.14) }}>
            <AlertTriangle size={18} color={colors.warning} />
            <Txt variant="caption" style={{ flex: 1 }} color={colors.text}>
              Esto parece tu gasto fijo «{fixedMatch.name}». Ya está reservado en tu presupuesto; guardarlo aquí lo contaría doble.
            </Txt>
          </View>
        ) : null}
      </View>

      <CalendarModal
        visible={calOpen}
        onClose={() => setCalOpen(false)}
        value={date}
        onChange={setDate}
        maxDate={today()}
      />

      {/* Teclado + guardar */}
      <View style={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 8 }}>
        <Divider />
        <AmountKeypad value={amount} onChange={setAmount} />
        <View style={{ paddingHorizontal: 6 }}>
          <Button title={editId ? 'Guardar cambios' : 'Guardar'} onPress={save} disabled={!canSave} fullWidth />
        </View>
      </View>
    </View>
  );
}
