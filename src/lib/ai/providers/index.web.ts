/**
 * VARIANTE WEB (vista previa): las llamadas reales a IA no funcionan en el
 * navegador (CORS + sin llave). El adaptador lanza un aviso claro; el diseño de
 * la config y el chat sí se pueden previsualizar.
 */
import type { ProviderId } from '../keys';
import type { LLMProvider } from './types';

export function getProvider(_id: ProviderId): LLMProvider {
  return {
    async send() {
      throw new Error('El asistente de IA solo funciona en la app del celular.');
    },
  };
}

export { PROVIDERS, PROVIDER_LIST } from './registry';
export type { ProviderMeta } from './registry';
export type { LLMProvider, NormMessage, ToolCall, ToolSpec, LLMResult, SendOptions } from './types';
