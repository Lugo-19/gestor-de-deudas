/**
 * Adaptador compatible con la API de OpenAI (chat/completions con tools).
 * Cubre OpenAI y Gemini (que expone un endpoint compatible en /v1beta/openai),
 * y cualquier otro proveedor compatible-OpenAI. Solo cambia `baseUrl`/llave/modelo.
 */
import type { LLMProvider, LLMResult, NormMessage, SendOptions } from './types';

function safeParse(s: any): Record<string, any> {
  if (s == null) return {};
  if (typeof s === 'object') return s;
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function toOpenAIMessages(system: string, messages: NormMessage[]) {
  const out: any[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') {
      if (m.attachments?.length) {
        // Contenido multimodal: texto + imágenes (data URI) y/o PDF (file).
        const parts: any[] = [{ type: 'text', text: m.text ?? '' }];
        for (const att of m.attachments) {
          if (att.kind === 'image') {
            parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.data}` } });
          } else {
            parts.push({ type: 'file', file: { filename: att.name ?? 'documento.pdf', file_data: `data:application/pdf;base64,${att.data}` } });
          }
        }
        out.push({ role: 'user', content: parts });
      } else {
        out.push({ role: 'user', content: m.text ?? '' });
      }
    } else if (m.role === 'assistant') {
      const msg: any = { role: 'assistant', content: m.text ?? '' };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
        }));
      }
      out.push(msg);
    } else {
      out.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.text ?? '' });
    }
  }
  return out;
}

export function createOpenAICompatProvider(baseUrl: string): LLMProvider {
  return {
    async send(messages, opts: SendOptions): Promise<LLMResult> {
      const body: Record<string, any> = {
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        messages: toOpenAIMessages(opts.system, messages),
      };
      // Solo enviar herramientas si hay: pasar tools=[] rompe en Gemini.
      if (opts.tools.length) {
        body.tools = opts.tools.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.parameters },
        }));
        body.tool_choice = 'auto';
      }
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${opts.apiKey}`,
        },
        signal: opts.signal,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`IA ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message ?? {};
      const text = (msg.content ?? '').toString().trim();
      const toolCalls = (msg.tool_calls ?? []).map((tc: any) => ({
        id: tc.id as string,
        name: tc.function?.name as string,
        args: safeParse(tc.function?.arguments),
      }));
      return { text, toolCalls };
    },
  };
}
