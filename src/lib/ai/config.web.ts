/**
 * VARIANTE WEB (vista previa): config en memoria, sin SQLite.
 */
import { getApiKey, type ProviderId } from './keys';
import { PROVIDERS } from './providers/registry';

export interface AiConfig {
  provider: ProviderId;
  model: string;
  apiKey: string | null;
}

let row: { provider: ProviderId; model: string } = { provider: 'gemini', model: '' };

export function readAiConfigRow(): { provider: ProviderId; model: string } {
  return { provider: row.provider, model: row.model || PROVIDERS[row.provider].defaultModel };
}

export async function loadAiConfig(): Promise<AiConfig> {
  const r = readAiConfigRow();
  return { ...r, apiKey: await getApiKey(r.provider) };
}

export function setAiConfig(patch: { provider?: ProviderId; model?: string }) {
  row = { ...row, ...patch };
}
