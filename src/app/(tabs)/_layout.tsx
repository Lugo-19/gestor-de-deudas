import { View } from 'react-native';
import { Redirect, Tabs, usePathname } from 'expo-router';

import { AddFab, TabBar } from '@/components/tab-bar';
import { useSettings } from '@/store/settings';

// El botón "+" no aplica en estas pantallas (chat, configuración).
const HIDE_FAB = ['/asistente', '/ajustes'];

export default function TabsLayout() {
  const onboarded = useSettings((s) => s.settings.onboarded);
  const pathname = usePathname();

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="movimientos" />
        <Tabs.Screen name="planificacion" />
        <Tabs.Screen name="estadisticas" />
        <Tabs.Screen name="asistente" />
        <Tabs.Screen name="ajustes" />
      </Tabs>
      {!HIDE_FAB.includes(pathname) && <AddFab />}
    </View>
  );
}
