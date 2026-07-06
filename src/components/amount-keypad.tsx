/**
 * Teclado numérico grande para capturar montos rápido. Controlado: recibe el
 * valor como string y notifica cambios. Incluye decimal y borrar, con haptics.
 */
import { Pressable, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/theme-provider';
import { Txt } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

export function AmountKeypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors, radius } = useTheme();

  function press(key: string) {
    Haptics.selectionAsync().catch(() => {});
    if (key === 'del') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (value.includes('.')) return;
      onChange(value === '' ? '0.' : value + '.');
      return;
    }
    // Limita a 2 decimales.
    if (value.includes('.') && value.split('.')[1]?.length >= 2) return;
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }
    onChange(value + key);
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {KEYS.map((key) => (
        <View key={key} style={{ width: '33.333%', padding: 6 }}>
          <Pressable
            onPress={() => press(key)}
            style={({ pressed }) => ({
              height: 64,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}>
            {key === 'del' ? (
              <Delete size={26} color={colors.textMuted} />
            ) : (
              <Txt style={{ fontSize: 28, fontWeight: '600' }}>{key}</Txt>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}
