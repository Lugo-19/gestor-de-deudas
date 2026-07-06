/**
 * Formato NORMALIZADO de mensajes/herramientas, independiente del proveedor.
 * Cada adaptador traduce esto ↔ el REST de su proveedor.
 */
import type { ProviderId } from '../keys';

export type { ProviderId };

/** Herramienta expuesta al modelo (subconjunto de ToolDef). */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

/**
 * Adjunto multimodal en un mensaje del usuario (foto/imagen o PDF).
 * `data` es base64 SIN el prefijo `data:` (cada adaptador arma su formato).
 */
export interface Attachment {
  kind: 'image' | 'document';
  /** Tipo MIME: 'image/jpeg', 'image/png', 'application/pdf', … */
  mimeType: string;
  /** Contenido en base64 (sin `data:...;base64,`). */
  data: string;
  /** Nombre visible (útil en documentos). */
  name?: string;
}

/** Un turno de la conversación en formato neutral. */
export interface NormMessage {
  role: 'user' | 'assistant' | 'tool';
  text?: string;
  /** Solo en 'user': imágenes/PDF adjuntos para análisis multimodal. */
  attachments?: Attachment[];
  /** Solo en 'assistant': llamadas a herramientas que pidió el modelo. */
  toolCalls?: ToolCall[];
  /** Solo en 'tool': a qué llamada responde. */
  toolCallId?: string;
  name?: string; // nombre de la función (turno 'tool')
}

/** Respuesta del modelo tras una llamada. */
export interface LLMResult {
  text: string;
  toolCalls: ToolCall[];
}

export interface SendOptions {
  system: string;
  model: string;
  apiKey: string;
  tools: ToolSpec[];
  signal?: AbortSignal;
  maxTokens?: number;
}

export interface LLMProvider {
  send(messages: NormMessage[], opts: SendOptions): Promise<LLMResult>;
}
