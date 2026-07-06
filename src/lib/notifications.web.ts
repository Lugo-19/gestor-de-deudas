/** VARIANTE WEB (vista previa): recordatorios no-op en el navegador. */
export async function ensureNotificationPermissions() {
  return false;
}
export async function scheduleReminder(): Promise<string | null> {
  return null;
}
export async function cancelReminder() {}
