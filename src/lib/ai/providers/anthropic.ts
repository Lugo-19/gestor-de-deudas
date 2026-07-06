/**
 * Adaptador Claude (Anthropic Messages API). Traduce el formato normalizado ↔
 * el REST de Anthropic (bloques tool_use / tool_result).
 */
import type { LLMProvider, LLMResult, NormMessage, SendOptions } from './types';

function toAnthropicMessages(messages: NormMessage[]) {
  const out: any[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === 'user') {
      const content: any[] = [];
      // Adjuntos primero (recomendación de Anthropic: imágenes antes del texto).
      for (const att of m.attachments ?? []) {
        if (att.kind === 'image') {
          content.push({ type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.data } });
        } else {
          content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } });
        }
      }
      content.push({ type: 'text', text: m.text ?? '' });
      out.push({ role: 'user', content });
      i++;
    } else if (m.role === 'assistant') {
      const content: any[] = [];
      if (m.text) content.push({ type: 'text', text: m.text });
      for (const tc of m.toolCalls ?? []) content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args });
      out.push({ role: 'assistant', content });
      i++;
    } else {
      // 'tool': agrupa respuestas consecutivas en un único mensaje de usuario.
      const content: any[] = [];
      while (i < messages.length && messages[i].role === 'tool') {
        const t = messages[i];
        content.push({ type: 'tool_result', tool_use_id: t.toolCallId, content: t.text ?? '' });
        i++;
      }
      out.push({ role: 'user', content });
    }
  }
  return out;
}

export function createAnthropicProvider(baseUrl: string): LLMProvider {
  return {
    async send(messages, opts: SendOptions): Promise<LLMResult> {
      const body: Record<string, any> = {
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        messages: toAnthropicMessages(messages),
      };
      if (opts.tools.length) {
        body.tools = opts.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
        body.tool_choice = { type: 'auto' };
      }
      const res = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: opts.signal,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Claude ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      const blocks: any[] = data.content ?? [];
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
      const toolCalls = blocks
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({ id: b.id as string, name: b.name as string, args: (b.input ?? {}) as Record<string, any> }));
      return { text, toolCalls };
    },
  };
}
