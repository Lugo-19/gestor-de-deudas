/**
 * Categorías por defecto que se siembran al primer arranque.
 * `icon` es una clave que resuelve `CategoryIcon` a un componente de lucide-react-native.
 */
export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Gastos
  { name: 'Comida', icon: 'utensils', color: '#F97316', type: 'expense' },
  { name: 'Transporte', icon: 'bus', color: '#0EA5E9', type: 'expense' },
  { name: 'Hogar', icon: 'house', color: '#8B5CF6', type: 'expense' },
  { name: 'Servicios', icon: 'zap', color: '#EAB308', type: 'expense' },
  { name: 'Compras', icon: 'shopping-bag', color: '#EC4899', type: 'expense' },
  { name: 'Ocio', icon: 'gamepad', color: '#14B8A6', type: 'expense' },
  { name: 'Salud', icon: 'heart-pulse', color: '#EF4444', type: 'expense' },
  { name: 'Educación', icon: 'graduation-cap', color: '#6366F1', type: 'expense' },
  { name: 'Deudas', icon: 'landmark', color: '#64748B', type: 'expense' },
  { name: 'Otros', icon: 'shapes', color: '#94A3B8', type: 'expense' },
  // Ingresos
  { name: 'Sueldo', icon: 'wallet', color: '#12A150', type: 'income' },
  { name: 'Ingreso extra', icon: 'trending-up', color: '#22C55E', type: 'income' },
];

/** Claves de icono disponibles para el selector al crear categorías nuevas. */
export const ICON_KEYS = [
  'utensils', 'bus', 'car', 'house', 'zap', 'shopping-bag', 'shopping-cart',
  'gamepad', 'heart-pulse', 'graduation-cap', 'landmark', 'credit-card',
  'wallet', 'trending-up', 'piggy-bank', 'gift', 'coffee', 'plane', 'fuel',
  'dumbbell', 'smartphone', 'shirt', 'baby', 'paw-print', 'shapes', 'tag',
] as const;
