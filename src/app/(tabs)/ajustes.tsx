import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, Check, Download, Plus, Tags, Trash2,
} from 'lucide-react-native';

import { Screen } from '@/components/screen';
import { Button, Card, Divider, IconBubble, SectionTitle, Txt } from '@/components/ui';
import { Segmented } from '@/components/segmented';
import { LabeledInput } from '@/components/form';
import { AiSettings } from '@/components/ai-settings';
import { useFixedExpenses } from '@/db/hooks';
import { addFixedExpense, deleteFixedExpense } from '@/db/actions';
import { useConfirm } from '@/components/confirm-dialog';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { ACCENT_PRESETS } from '@/theme/palette';
import { ensureNotificationPermissions } from '@/lib/notifications';
import { exportTransactionsCsv } from '@/lib/export';
import { formatCurrency } from '@/lib/format';

export default function Ajustes() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const fixed = useFixedExpenses();

  const [income, setIncome] = useState(String(settings.monthlyIncome || ''));
  const [savings, setSavings] = useState(String(settings.savingsGoal || ''));
  const [currency, setCurrency] = useState(settings.currency);
  const [fxName, setFxName] = useState('');
  const [fxAmount, setFxAmount] = useState('');

  async function enableReminders() {
    const ok = await ensureNotificationPermissions();
    Alert.alert(ok ? 'Recordatorios activados' : 'Permiso denegado', ok ? 'Te avisaremos de tus pagos programados.' : 'Actívalos desde los ajustes del sistema.');
  }

  function addFx() {
    const amt = parseFloat(fxAmount || '0') || 0;
    if (!fxName.trim() || amt <= 0) return;
    addFixedExpense({ name: fxName.trim(), amount: amt, dayOfMonth: 1 });
    setFxName('');
    setFxAmount('');
  }

  return (
    <Screen title="Ajustes">
      {/* Apariencia */}
      <Card style={{ gap: 16 }}>
        <SectionTitle>Apariencia</SectionTitle>

        <View style={{ gap: 8 }}>
          <Txt variant="label" muted>Tema</Txt>
          <Segmented
            options={[{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]}
            value={settings.themeMode}
            onChange={(v) => update({ themeMode: v })}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Txt variant="label" muted>Color principal</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {ACCENT_PRESETS.map((c) => {
              const active = c.value.toLowerCase() === settings.accentColor.toLowerCase();
              return (
                <Pressable
                  key={c.value}
                  onPress={() => update({ accentColor: c.value })}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.value, alignItems: 'center', justifyContent: 'center', borderWidth: active ? 3 : 0, borderColor: colors.bg }}>
                  {active ? <Check size={20} color="#fff" strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      {/* Finanzas */}
      <Card style={{ gap: 14 }}>
        <SectionTitle>Tu presupuesto</SectionTitle>
        <LabeledInput label="Ingreso mensual" value={income} onChangeText={setIncome} keyboardType="decimal-pad" placeholder="0"
          right={<Pressable onPress={() => update({ monthlyIncome: parseFloat(income || '0') || 0 })}><Txt variant="label" color={colors.accent}>Guardar</Txt></Pressable>} />
        <LabeledInput label="Meta de ahorro mensual" value={savings} onChangeText={setSavings} keyboardType="decimal-pad" placeholder="0"
          right={<Pressable onPress={() => update({ savingsGoal: parseFloat(savings || '0') || 0 })}><Txt variant="label" color={colors.accent}>Guardar</Txt></Pressable>} />
        <LabeledInput label="Moneda (código ISO, ej. USD, MXN, EUR)" value={currency} onChangeText={(v) => setCurrency(v.toUpperCase())} placeholder="USD"
          right={<Pressable onPress={() => update({ currency: currency.trim().toUpperCase() || 'USD' })}><Txt variant="label" color={colors.accent}>Guardar</Txt></Pressable>} />
      </Card>

      {/* Gastos fijos */}
      <Card style={{ gap: 12 }}>
        <SectionTitle>Gastos fijos mensuales</SectionTitle>
        <Txt variant="caption" faint style={{ marginTop: -6 }}>
          Ya están reservados en tu presupuesto. No los registres otra vez como movimientos.
        </Txt>
        {fixed.length === 0 ? (
          <Txt variant="caption" faint>Añade tus gastos recurrentes (renta, servicios…) para un cálculo más preciso.</Txt>
        ) : (
          fixed.map((f, i) => (
            <View key={f.id}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>{f.name}</Txt>
                <Txt variant="body" muted style={{ marginRight: 12 }}>{formatCurrency(f.amount, settings.currency)}</Txt>
                <Pressable
                  onPress={async () => {
                    if (await confirm({ title: '¿Eliminar gasto fijo?', message: 'Se recalculará tu presupuesto disponible.', destructive: true })) {
                      deleteFixedExpense(f.id);
                    }
                  }}
                  hitSlop={8}>
                  <Trash2 size={18} color={colors.expense} />
                </Pressable>
              </View>
            </View>
          ))
        )}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 2 }}><LabeledInput label="Nombre" value={fxName} onChangeText={setFxName} placeholder="Renta" /></View>
          <View style={{ flex: 1 }}><LabeledInput label="Monto" value={fxAmount} onChangeText={setFxAmount} keyboardType="decimal-pad" placeholder="0" /></View>
          <Pressable onPress={addFx} style={{ width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={22} color={colors.onAccent} />
          </Pressable>
        </View>
      </Card>

      {/* Categorías */}
      <Pressable onPress={() => router.push('/categories')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBubble color={colors.accent} size={40}><Tags size={20} color={colors.accent} /></IconBubble>
          <View style={{ flex: 1 }}>
            <Txt variant="body">Gestionar categorías</Txt>
            <Txt variant="caption" faint>Crea, edita o elimina categorías</Txt>
          </View>
        </Card>
      </Pressable>

      {/* Recordatorios + export */}
      <Card style={{ gap: 12 }}>
        <SectionTitle>Datos y notificaciones</SectionTitle>
        <Button title="Activar recordatorios" variant="secondary" icon={<Bell size={18} color={colors.text} />} onPress={enableReminders} fullWidth />
        <Button title="Exportar movimientos (CSV)" variant="secondary" icon={<Download size={18} color={colors.text} />} onPress={() => exportTransactionsCsv()} fullWidth />
      </Card>

      {/* Asistente de IA (BYOK) */}
      <AiSettings />

      <Txt variant="caption" faint style={{ textAlign: 'center', marginTop: 4 }}>app-cuentas · tus datos se guardan solo en este dispositivo</Txt>
    </Screen>
  );
}
