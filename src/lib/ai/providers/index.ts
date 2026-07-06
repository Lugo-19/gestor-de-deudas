/**
 * Factory: dado un proveedor, devuelve el adaptador adecuado según su `kind`.
 */
import type { ProviderId } from '../keys';
import type { LLMProvider } from './types';
import { PROVIDERS } from './registry';
import { createAnthropicProvider } from './anthropic';
import { createOpenAICompatProvider } from './openai-compat';

export function getProvider(id: ProviderId): LLMProvider {
  const meta = PROVIDERS[id];
  if (meta.kind === 'anthropic') return createAnthropicProvider(meta.baseUrl);
  return createOpenAICompatProvider(meta.baseUrl);
}

export { PROVIDERS, PROVIDER_LIST } from './registry';
export type { ProviderMeta } from './registry';
export type { LLMProvider, NormMessage, ToolCall, ToolSpec, LLMResult, SendOptions } from './types';
