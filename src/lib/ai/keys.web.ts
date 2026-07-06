/**
 * VARIANTE WEB (vista previa): las llaves viven en memoria (no hay llavero).
 * Suficiente para revisar el diseño de la configuración; en el celular se usa
 * el llavero real vía expo-secure-store.
 */
export type ProviderId = 'gemini' | 'claude' | 'openai';

const mem: Partial<Record<ProviderId, string>> = {};

export async function getApiKey(p: ProviderId): Promise<string | null> {
  return mem[p] ?? null;
}
export async function setApiKey(p: ProviderId, value: string): Promise<void> {
  const v = value.trim();
  if (!v) delete mem[p];
  else mem[p] = v;
}
export async function deleteApiKey(p: ProviderId): Promise<void> {
  delete mem[p];
}
export async function hasApiKey(p: ProviderId): Promise<boolean> {
  return !!mem[p];
}
