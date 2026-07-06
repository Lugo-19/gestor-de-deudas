/**
 * Calendario propio (Views RN puras, funciona en móvil y en la vista previa web).
 * `CalendarPicker` es la cuadrícula mensual; `CalendarModal` la presenta como
 * overlay. Las fechas se manejan como string ISO (YYYY-MM-DD), que ordena
 * lexicográficamente, así que los límites min/max se comparan con < y >.
 */
import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { dayjs, today } from '@/lib/format';
import { Button, Card, Txt } from './ui';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface CalendarPickerProps {
  value: string; // YYYY-MM-DD (o '' = ninguno)
  onChange: (iso: string) => void;
  minDate?: string; // YYYY-MM-DD inclusive
  maxDate?: string; // YYYY-MM-DD inclusive
}

export function CalendarPicker({ value, onChange, minDate, maxDate }: CalendarPickerProps) {
  const { colors, radius } = useTheme();
  const todayISO = today();
  const [viewMonth, setViewMonth] = useState(() => dayjs(value || todayISO).startOf('month'));

  const cells = useMemo(() => {
    const daysInMonth = viewMonth.daysInMonth();
    // Semana empieza en lunes: day() da 0=Dom..6=Sáb → (day()+6)%7 pone lunes en 0.
    const offset = (viewMonth.day() + 6) % 7;
    const list: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(viewMonth.date(d).format('YYYY-MM-DD'));
    }
    return list;
  }, [viewMonth]);

  const outOfRange = (iso: string) =>
    (minDate != null && iso < minDate) || (maxDate != null && iso > maxDate);

  const prevDisabled = minDate != null && viewMonth.subtract(1, 'month').endOf('month').format('YYYY-MM-DD') < minDate;
  const nextDisabled = maxDate != null && viewMonth.add(1, 'month').startOf('month').format('YYYY-MM-DD') > maxDate;

  const monthLabel = viewMonth.format('MMMM YYYY');

  return (
    <View style={{ gap: 12 }}>
      {/* Cabecera con navegación de mes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NavButton disabled={prevDisabled} onPress={() => setViewMonth((m) => m.subtract(1, 'month'))}>
          <ChevronLeft size={20} color={prevDisabled ? colors.textFaint : colors.text} />
        </NavButton>
        <Txt variant="subtitle">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Txt>
        <NavButton disabled={nextDisabled} onPress={() => setViewMonth((m) => m.add(1, 'month'))}>
          <ChevronRight size={20} color={nextDisabled ? colors.textFaint : colors.text} />
        </NavButton>
      </View>

      {/* Encabezados de día */}
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ width: '14.28%', alignItems: 'center' }}>
            <Txt variant="caption" faint>{w}</Txt>
          </View>
        ))}
      </View>

      {/* Cuadrícula de días */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((iso, i) => {
          if (iso == null) return <View key={`b${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
          const selected = iso === value;
          const isToday = iso === todayISO;
          const disabled = outOfRange(iso);
          const day = Number(iso.slice(8, 10));
          return (
            <View key={iso} style={{ width: '14.28%', aspectRatio: 1, padding: 3 }}>
              <Pressable
                disabled={disabled}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(iso); }}
                style={{
                  flex: 1,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.accent : 'transparent',
                  borderWidth: !selected && isToday ? 1 : 0,
                  borderColor: colors.accent,
                  opacity: disabled ? 0.3 : 1,
                }}>
                <Txt
                  variant="body"
                  color={selected ? colors.onAccent : isToday ? colors.accent : colors.text}>
                  {day}
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NavButton({ children, onPress, disabled }: { children: React.ReactNode; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, opacity: disabled ? 0.4 : 1 }}>
      {children}
    </Pressable>
  );
}

export interface CalendarModalProps extends CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export function CalendarModal({ visible, onClose, title = 'Elegir fecha', ...pickerProps }: CalendarModalProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: withAlpha(colors.shadow, 0.45),
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}>
        {/* El toque dentro de la tarjeta no cierra el modal */}
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 380 }}>
          <Card style={{ gap: 14 }}>
            <Txt variant="title">{title}</Txt>
            <CalendarPicker {...pickerProps} />
            <Button title="Listo" onPress={onClose} fullWidth />
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
