/**
 * Selector de categoría por iconos. Cuadrícula de burbujas; la seleccionada se
 * resalta con su color. Pensado para elegir en un toque.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import type { Category } from '@/db/schema';
import { CategoryIcon } from './category-icon';
import { Txt } from './ui';

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {categories.map((cat) => (
        <CategoryChip
          key={cat.id}
          category={cat}
          selected={cat.id === selectedId}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onSelect(cat.id);
          }}
        />
      ))}
    </ScrollView>
  );
}

function CategoryChip({ category, selected, onPress }: { category: Category; selected: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ width: '25%', padding: 6 }}>
      <Pressable
        onPress={onPress}
        style={{
          alignItems: 'center',
          gap: 6,
          paddingVertical: 12,
          borderRadius: radius.md,
          backgroundColor: selected ? withAlpha(category.color, 0.16) : colors.surface,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: selected ? category.color : colors.border,
        }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(category.color, 0.16),
          }}>
          <CategoryIcon icon={category.icon} color={category.color} size={20} />
        </View>
        <Txt variant="caption" numberOfLines={1} muted={!selected} style={{ maxWidth: '100%' }}>
          {category.name}
        </Txt>
      </Pressable>
    </View>
  );
}
