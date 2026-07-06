/**
 * Fase D: verifica que los adjuntos (imagen/PDF) se traduzcan al formato REST
 * correcto de cada proveedor. Se mockea `fetch` para capturar el cuerpo enviado.
 */
import { createAnthropicProvider } from '@/lib/ai/providers/anthropic';
import { createOpenAICompatProvider } from '@/lib/ai/providers/openai-compat';
import type { NormMessage, SendOptions } from '@/lib/ai/providers/types';

const opts: SendOptions = { system: 'sys', model: 'm', apiKey: 'k', tools: [] };

function mockFetch(json: any) {
  const spy = jest.fn(async () => ({ ok: true, json: async () => json, text: async () => '' }));
  (global as any).fetch = spy;
  return spy;
}

const imgMsg: NormMessage = {
  role: 'user',
  text: 'Registra este recibo',
  attachments: [{ kind: 'image', mimeType: 'image/png', data: 'BASE64IMG' }],
};
const pdfMsg: NormMessage = {
  role: 'user',
  text: 'Analiza',
  attachments: [{ kind: 'document', mimeType: 'application/pdf', data: 'BASE64PDF', name: 'factura.pdf' }],
};

function sentBody(spy: jest.Mock) {
  return JSON.parse(spy.mock.calls[0][1].body);
}

describe('Claude (anthropic) multimodal', () => {
  it('envía la imagen como bloque source base64 antes del texto', async () => {
    const spy = mockFetch({ content: [{ type: 'text', text: 'ok' }] });
    await createAnthropicProvider('https://x/v1').send([imgMsg], opts);
    const content = sentBody(spy).messages[0].content;
    expect(content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'BASE64IMG' } });
    expect(content[content.length - 1]).toEqual({ type: 'text', text: 'Registra este recibo' });
  });

  it('envía el PDF como bloque document', async () => {
    const spy = mockFetch({ content: [{ type: 'text', text: 'ok' }] });
    await createAnthropicProvider('https://x/v1').send([pdfMsg], opts);
    const content = sentBody(spy).messages[0].content;
    expect(content[0]).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'BASE64PDF' } });
  });
});

describe('OpenAI-compat (OpenAI/Gemini) multimodal', () => {
  it('envía la imagen como image_url con data URI', async () => {
    const spy = mockFetch({ choices: [{ message: { content: 'ok' } }] });
    await createOpenAICompatProvider('https://x/v1').send([imgMsg], opts);
    const content = sentBody(spy).messages[1].content; // [0] = system
    expect(content[0]).toEqual({ type: 'text', text: 'Registra este recibo' });
    expect(content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/png;base64,BASE64IMG' } });
  });

  it('envía el PDF como parte file con file_data', async () => {
    const spy = mockFetch({ choices: [{ message: { content: 'ok' } }] });
    await createOpenAICompatProvider('https://x/v1').send([pdfMsg], opts);
    const content = sentBody(spy).messages[1].content;
    expect(content[1]).toEqual({ type: 'file', file: { filename: 'factura.pdf', file_data: 'data:application/pdf;base64,BASE64PDF' } });
  });

  it('sin adjuntos, el contenido del usuario es texto plano (no rompe Gemini)', async () => {
    const spy = mockFetch({ choices: [{ message: { content: 'ok' } }] });
    await createOpenAICompatProvider('https://x/v1').send([{ role: 'user', text: 'hola' }], opts);
    expect(sentBody(spy).messages[1].content).toBe('hola');
  });
});
