/**
 * Recordatorios locales para gastos programados y vencimientos de deuda.
 * Usa notificaciones locales de expo-notifications (disponibles en Expo Go;
 * solo el push remoto requiere development build).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dayjs } from './format';

// Muestra la notificación aunque la app esté en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionRequested = false;

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionRequested && !current.canAskAgain) return false;
  permissionRequested = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Programa un recordatorio para las 9:00 del día de vencimiento.
 * Devuelve el id de la notificación (para poder cancelarla), o null si la fecha ya pasó.
 */
export async function scheduleReminder(
  title: string,
  body: string,
  dueDateISO: string,
): Promise<string | null> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  const date = dayjs(dueDateISO).hour(9).minute(0).second(0);
  if (date.isBefore(dayjs())) return null;

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: date.toDate(),
      channelId: 'reminders',
    },
  });
}

export async function cancelReminder(notificationId: string | null | undefined) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ya cancelada o inexistente
  }
}
