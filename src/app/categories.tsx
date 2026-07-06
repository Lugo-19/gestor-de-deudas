import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ModalScreen } from '@/components/modal-screen';
import { LabeledInput } from '@/components/form';
import { Segmented } from '@/components/segmented';
import { Button, Card, Divider, IconBubble, SectionTitle, Txt } from '@/components/ui';
import { CategoryIcon } from '@/components/category-icon';
import { ICON_KEYS } from '@/constants/categories';
import { useCategories } from '@/db/hooks';
import { addCategory, deleteCategory } from '@/db/actions';
import { useConfirm } from '@/components/confirm-dialog';
import { useTheme } from '@/theme/theme-provider';
import { Trash2 } from 'lucide-react-native';

const COLORS = ['#F97316', '#0EA5E9', '#8B5CF6', '#EAB308', '#EC4899', '#14B8A6', '#EF4444', '#6366F1', '#12A150', '#64748B'];

export default function CategoriesModal() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const all = useCategories();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICON_KEYS[0]);
  const [color, setColor] = useState(COLORS[0]);

  function add() {
    if (!name.trim()) return;
    addCategory({ name: name.trim(), icon, color, type });
    setName('');
  }

  const list = all.filter((c) => c.type === type);

  return (
    <ModalScreen title="Categorías">
      <Segmented
        options={[{ value: 'expense', label: 'Gastos' }, { value: 'income', label: 'Ingresos' }]}
        value={type}
        onChange={setType}
      />

      {/* Nueva categoría */}
      <Card style={{ gap: 12 }}>
        <SectionTitle>Nueva categoría</SectionTitle>
        <LabeledInput label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Mascotas" />

        <Txt variant="label" muted>Icono</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ICON_KEYS.map((k) => (
            <Pressable key={k} onPress={() => setIcon(k)}
              style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: icon === k ? color : colors.surfaceAlt }}>
              <CategoryIcon icon={k} color={icon === k ? '#fff' : colors.textMuted} size={20} />
            </Pressable>
          ))}
        </ScrollView>

        <Txt variant="label" muted>Color</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.bg }} />
          ))}
        </View>

        <Button title="Añadir categoría" onPress={add} disabled={!name.trim()} fullWidth />
      </Card>

      {/* Existentes */}
      <Card>
        <SectionTitle>Tus categorías</SectionTitle>
        {list.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
              <IconBubble color={c.color} size={38}><CategoryIcon icon={c.icon} color={c.color} size={18} /></IconBubble>
              <Txt variant="body" style={{ flex: 1 }}>{c.name}</Txt>
              <Pressable
                onPress={async () => {
                  if (await confirm({ title: '¿Eliminar categoría?', message: 'Los movimientos con esta categoría quedarán sin categoría.', destructive: true })) {
                    deleteCategory(c.id);
                  }
                }}
                hitSlop={8}>
                <Trash2 size={18} color={colors.expense} />
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
    </ModalScreen>
  );
}
