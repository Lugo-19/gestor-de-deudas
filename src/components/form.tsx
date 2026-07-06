/**
 * Campos de formulario reutilizables, temáticos.
 */
import { type ReactNode } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { Txt } from './ui';

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  right,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  right?: ReactNode;
  autoFocus?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" muted>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 50 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          style={{ flex: 1, color: colors.text, fontSize: 16 }}
        />
        {right}
      </View>
    </View>
  );
}
