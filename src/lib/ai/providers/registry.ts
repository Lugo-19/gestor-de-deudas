/**
 * Catálogo de proveedores soportados. `kind` decide qué adaptador se usa:
 *  - 'anthropic'  → adaptador Claude
 *  - 'openai'     → adaptador compatible-OpenAI (cubre OpenAI y Gemini, que
 *                   expone un endpoint compatible en /v1beta/openai).
 * Añadir un proveedor nuevo compatible-OpenAI es solo agregar una entrada aquí.
 */
import type { ProviderId } from '../keys';

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  kind: 'anthropic' | 'openai';
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyHint: string;
  keyUrl: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    kind: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    keyHint: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  claude: {
    id: 'claude',
    label: 'Claude (Anthropic)',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-haiku-4-5',
    models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'],
    keyHint: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o'],
    keyHint: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);
