/**
 * Llaves de API de los proveedores de IA. Se guardan cifradas en el llavero del
 * sistema (expo-secure-store) — NUNCA en SQLite ni en logs.
 */
import * as SecureStore from 'expo-secure-store';

export type ProviderId = 'gemini' | 'claude' | 'openai';

const keyName = (p: ProviderId) => `llm_key_${p}`;

export async function getApiKey(p: ProviderId): Promise<string | null> {
  return SecureStore.getItemAsync(keyName(p));
}

export async function setApiKey(p: ProviderId, value: string): Promise<void> {
  const v = value.trim();
  if (!v) return SecureStore.deleteItemAsync(keyName(p));
  return SecureStore.setItemAsync(keyName(p), v);
}

export async function deleteApiKey(p: ProviderId): Promise<void> {
  return SecureStore.deleteItemAsync(keyName(p));
}

export async function hasApiKey(p: ProviderId): Promise<boolean> {
  return !!(await getApiKey(p));
}
