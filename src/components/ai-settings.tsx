/**
 * Configuración del Asistente de IA (BYOK): elegir proveedor, pegar la llave
 * (cifrada en el llavero), elegir modelo y probar la conexión.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';
import { Check, ExternalLink, Sparkles } from 'lucide-react-native';

import { Button, Card, IconBubble, SectionTitle, Txt } from '@/components/ui';
import { Segmented } from '@/components/segmented';
import { LabeledInput } from '@/components/form';
import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { PROVIDERS, getProvider } from '@/lib/ai/providers';
import { readAiConfigRow, setAiConfig } from '@/lib/ai/config';
import { getApiKey, setApiKey, type ProviderId } from '@/lib/ai/keys';

const SHORT: Record<ProviderId, string> = { gemini: 'Gemini', claude: 'Claude', openai: 'OpenAI' };

/** Enmascara una llave dejando ver solo los últimos 4 caracteres. */
function maskKey(key: string): string {
  return '•'.repeat(8) + key.slice(-4);
}

export function AiSettings() {
  const { colors, radius } = useTheme();
  const initial = readAiConfigRow();
  const [provider, setProvider] = useState<ProviderId>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [keyInput, setKeyInput] = useState('');
  const [savedMask, setSavedMask] = useState('');
  const [testing, setTesting] = useState(false);

  const meta = PROVIDERS[provider];
  const keySaved = savedMask !== '';

  async function refreshMask(p: ProviderId) {
    const k = await getApiKey(p);
    setSavedMask(k ? maskKey(k) : '');
  }

  useEffect(() => {
    refreshMask(provider);
  }, [provider]);

  function switchProvider(p: ProviderId) {
    setProvider(p);
    const m = PROVIDERS[p].defaultModel;
    setModel(m);
    setAiConfig({ provider: p, model: m });
    setKeyInput('');
  }

  async function saveKey() {
    await setApiKey(provider, keyInput);
    setKeyInput('');
    await refreshMask(provider);
    Alert.alert('Llave guardada', `Tu llave de ${meta.label} se guardó cifrada en este dispositivo.`);
  }

  function pickModel(m: string) {
    setModel(m);
    setAiConfig({ model: m });
  }

  async function test() {
    setTesting(true);
    try {
      const key = await getApiKey(provider);
      if (!key) {
        Alert.alert('Falta la llave', 'Pega y guarda tu llave antes de probar.');
        return;
      }
      await getProvider(provider).send([{ role: 'user', text: 'Responde solo: OK' }], {
        system: 'Eres una prueba de conexión. Responde brevemente.',
        model,
        apiKey: key,
        tools: [],
        maxTokens: 16,
      });
      Alert.alert('¡Conexión exitosa!', 'Tu asistente está listo para usarse.');
    } catch (e: any) {
      Alert.alert('No se pudo conectar', String(e?.message ?? e).slice(0, 220));
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBubble color={colors.accent} size={38}>
          <Sparkles size={19} color={colors.accent} />
        </IconBubble>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle">Asistente de IA</Txt>
          <Txt variant="caption" faint>Usa tu propia llave; se guarda solo en tu celular.</Txt>
        </View>
      </View>

      {/* Proveedor */}
      <View style={{ gap: 8 }}>
        <Txt variant="label" muted>Proveedor</Txt>
        <Segmented
          options={(Object.keys(SHORT) as ProviderId[]).map((p) => ({ value: p, label: SHORT[p] }))}
          value={provider}
          onChange={switchProvider}
        />
      </View>

      {/* Llave */}
      <LabeledInput
        label={keySaved ? 'Llave (guardada — pega otra para reemplazar)' : `Llave de ${meta.label}`}
        value={keyInput}
        onChangeText={setKeyInput}
        placeholder={keySaved ? savedMask : meta.keyHint}
        right={
          keyInput.trim() ? (
            <Pressable onPress={saveKey}>
              <Txt variant="label" color={colors.accent}>Guardar</Txt>
            </Pressable>
          ) : keySaved ? (
            <Check size={18} color={colors.income} />
          ) : null
        }
      />
      <Pressable onPress={() => Linking.openURL(meta.keyUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ExternalLink size={14} color={colors.textMuted} />
        <Txt variant="caption" color={colors.textMuted}>Conseguir una llave de {meta.label}</Txt>
      </Pressable>

      {/* Modelo */}
      <View style={{ gap: 8 }}>
        <Txt variant="label" muted>Modelo</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {meta.models.map((m) => {
            const active = m === model;
            return (
              <Pressable
                key={m}
                onPress={() => pickModel(m)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? colors.accent : colors.surfaceAlt }}>
                <Txt variant="label" color={active ? colors.onAccent : colors.textMuted}>{m}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        title={testing ? 'Probando…' : 'Probar conexión'}
        variant="secondary"
        onPress={test}
        disabled={testing}
        icon={testing ? <ActivityIndicator size="small" color={colors.text} /> : undefined}
        fullWidth
      />

      {/* Aviso de privacidad */}
      <View style={{ backgroundColor: withAlpha(colors.warning, 0.12), borderRadius: radius.md, padding: 12 }}>
        <Txt variant="caption" color={colors.textMuted}>
          Al usar el asistente, un resumen de tus finanzas (montos y categorías, sin datos personales) se envía al
          proveedor que elijas para poder responder. Si prefieres no compartir nada, no configures ninguna llave.
        </Txt>
      </View>
    </Card>
  );
}
