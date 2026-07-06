/**
 * Configuración activa del asistente: proveedor + modelo (en SQLite) y la llave
 * (en el llavero). `loadAiConfig` reúne todo para el bucle del agente.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { llmConfig } from '@/db/schema';
import { getApiKey, type ProviderId } from './keys';
import { PROVIDERS } from './providers/registry';

export interface AiConfig {
  provider: ProviderId;
  model: string;
  apiKey: string | null;
}

/** Lee proveedor + modelo (sin llave). Síncrono. */
export function readAiConfigRow(): { provider: ProviderId; model: string } {
  const row = db.select().from(llmConfig).where(eq(llmConfig.id, 1)).get();
  const provider = (row?.provider ?? 'gemini') as ProviderId;
  const model = row?.model || PROVIDERS[provider].defaultModel;
  return { provider, model };
}

/** Config completa (incluye la llave del llavero). Async. */
export async function loadAiConfig(): Promise<AiConfig> {
  const { provider, model } = readAiConfigRow();
  const apiKey = await getApiKey(provider);
  return { provider, model, apiKey };
}

export function setAiConfig(patch: { provider?: ProviderId; model?: string }) {
  db.update(llmConfig).set(patch).where(eq(llmConfig.id, 1)).run();
}
