import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '@/theme/theme-provider';
import { ConfirmProvider } from '@/components/confirm-dialog';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <RootNavigator />
          </ConfirmProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { scheme, colors } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="debt" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scheduled" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
