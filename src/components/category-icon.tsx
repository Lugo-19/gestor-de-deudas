/**
 * Resuelve una clave de icono (guardada en la categoría) a un componente de
 * lucide-react-native. Centralizado para reusar en toda la app.
 */
import {
  Baby, Bus, Car, Coffee, CreditCard, Dumbbell, Fuel, Gamepad2, Gift,
  GraduationCap, HeartPulse, House, Landmark, PawPrint, PiggyBank, Plane,
  Shapes, Shirt, ShoppingBag, ShoppingCart, Smartphone, Tag, TrendingUp,
  Utensils, Wallet, Zap, type LucideIcon,
} from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  car: Car,
  house: House,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  gamepad: Gamepad2,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  landmark: Landmark,
  'credit-card': CreditCard,
  wallet: Wallet,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  gift: Gift,
  coffee: Coffee,
  plane: Plane,
  fuel: Fuel,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  shirt: Shirt,
  baby: Baby,
  'paw-print': PawPrint,
  shapes: Shapes,
  tag: Tag,
};

export function iconFor(key: string): LucideIcon {
  return ICONS[key] ?? Tag;
}

export function CategoryIcon({
  icon,
  size = 20,
  color,
  strokeWidth = 2,
}: {
  icon: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Icon = iconFor(icon);
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
