import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PiggyBank, Sparkles, Wallet } from 'lucide-react-native';

import { Button, IconBubble, Txt } from '@/components/ui';
import { LabeledInput } from '@/components/form';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { formatCurrency } from '@/lib/format';

const CURRENCIES = ['USD', 'MXN', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'];

export default function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [income, setIncome] = useState('');
  const [savings, setSavings] = useState('');

  function finish() {
    completeOnboarding({
      currency,
      monthlyIncome: parseFloat(income || '0') || 0,
      savingsGoal: parseFloat(savings || '0') || 0,
    });
    router.replace('/');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
      {/* Progreso */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 32 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? colors.accent : colors.surfaceAlt }} />
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {step === 0 && (
          <View style={{ gap: 16 }}>
            <IconBubble color={colors.accent} size={72}><Sparkles size={34} color={colors.accent} /></IconBubble>
            <Txt variant="display" style={{ fontSize: 34, lineHeight: 40 }}>Toma el control de tus gastos</Txt>
            <Txt variant="body" muted style={{ fontSize: 16, lineHeight: 24 }}>
              Registra en segundos, mira cuánto puedes gastar hoy y organiza tus deudas y pagos. Todo privado, guardado solo en tu celular.
            </Txt>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 18 }}>
            <IconBubble color={colors.accent} size={64}><Wallet size={30} color={colors.accent} /></IconBubble>
            <Txt variant="title">¿Cuánto ganas al mes?</Txt>
            <Txt variant="body" muted>Lo usamos para calcular cuánto puedes gastar. Puedes cambiarlo cuando quieras.</Txt>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CURRENCIES.map((c) => (
                <Pressable key={c} onPress={() => setCurrency(c)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: currency === c ? colors.accent : colors.surfaceAlt }}>
                  <Txt variant="label" color={currency === c ? colors.onAccent : colors.textMuted}>{c}</Txt>
                </Pressable>
              ))}
            </View>

            <LabeledInput label="Ingreso mensual" value={income} onChangeText={setIncome} keyboardType="decimal-pad" placeholder="0" autoFocus />
            {parseFloat(income || '0') > 0 ? (
              <Txt variant="caption" muted>≈ {formatCurrency((parseFloat(income) || 0) / 30, currency)} por día</Txt>
            ) : null}
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 18 }}>
            <IconBubble color={colors.income} size={64}><PiggyBank size={30} color={colors.income} /></IconBubble>
            <Txt variant="title">¿Quieres ahorrar cada mes?</Txt>
            <Txt variant="body" muted>Aparta una meta de ahorro y la descontamos de lo que puedes gastar. Opcional.</Txt>
            <LabeledInput label="Meta de ahorro mensual (opcional)" value={savings} onChangeText={setSavings} keyboardType="decimal-pad" placeholder="0" autoFocus />

            <View style={{ backgroundColor: withAlpha(colors.accent, 0.1), borderRadius: 16, padding: 16, gap: 4 }}>
              <Txt variant="label" color={colors.accent}>LISTO PARA EMPEZAR</Txt>
              <Txt variant="body">
                Ingreso: {formatCurrency(parseFloat(income || '0') || 0, currency)} · Ahorro: {formatCurrency(parseFloat(savings || '0') || 0, currency)}
              </Txt>
            </View>
          </View>
        )}
      </View>

      {/* Navegación */}
      <View style={{ gap: 12 }}>
        <Button
          title={step < 2 ? 'Continuar' : 'Empezar'}
          onPress={() => (step < 2 ? setStep(step + 1) : finish())}
          fullWidth
        />
        {step === 0 ? (
          <Pressable onPress={finish} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Txt variant="label" muted>Omitir por ahora</Txt>
          </Pressable>
        ) : (
          <Pressable onPress={() => setStep(step - 1)} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Txt variant="label" muted>Atrás</Txt>
          </Pressable>
        )}
      </View>
    </View>
  );
}
