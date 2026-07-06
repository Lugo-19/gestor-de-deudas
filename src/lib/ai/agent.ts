/**
 * Bucle del agente: coordina el modelo con las herramientas.
 *
 * Envía la conversación al proveedor; si el modelo pide herramientas, ejecuta
 * cada una (las de ESCRITURA piden confirmación al usuario vía `confirm`),
 * devuelve los resultados al modelo y repite hasta obtener una respuesta final
 * o alcanzar el límite de pasos.
 */
import { getProvider } from './providers';
import { TOOLS, getTool, type ToolDef } from './tools';
import type { NormMessage, ToolSpec } from './providers/types';
import type { AiConfig } from './config';

const MAX_STEPS = 6;
// 0 reintentos automáticos: un solo intento. Si falla, el usuario reintenta a
// mano con el botón "Reintentar" del chat (evita esperas y gasto duplicado).
const MAX_RETRIES = 0;

/** Envía al proveedor. Sin reintentos automáticos (ver MAX_RETRIES). */
async function sendWithRetry(
  provider: ReturnType<typeof getProvider>,
  msgs: NormMessage[],
  opts: Parameters<ReturnType<typeof getProvider>['send']>[1],
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await provider.send(msgs, opts);
    } catch (e) {
      lastErr = e;
      if (attempt === MAX_RETRIES) throw e;
    }
  }
  throw lastErr;
}

export interface AgentDeps {
  config: AiConfig;
  system: string;
  /** Pide confirmación para una acción de escritura. Devuelve true si procede. */
  confirm: (tool: ToolDef, args: Record<string, any>) => Promise<boolean>;
  signal?: AbortSignal;
}

export interface AgentResult {
  messages: NormMessage[];
  text: string;
}

export async function runAgent(messages: NormMessage[], deps: AgentDeps): Promise<AgentResult> {
  if (!deps.config.apiKey) {
    throw new Error('No hay una llave configurada. Ve a Ajustes → Asistente de IA.');
  }
  const provider = getProvider(deps.config.provider);
  const toolSpecs: ToolSpec[] = TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));

  const msgs = [...messages];
  for (let step = 0; step < MAX_STEPS; step++) {
    const result = await sendWithRetry(provider, msgs, {
      system: deps.system,
      model: deps.config.model,
      apiKey: deps.config.apiKey,
      tools: toolSpecs,
      signal: deps.signal,
      maxTokens: 1024,
    });

    msgs.push({ role: 'assistant', text: result.text, toolCalls: result.toolCalls });

    if (!result.toolCalls.length) return { messages: msgs, text: result.text };

    for (const tc of result.toolCalls) {
      const tool = getTool(tc.name);
      let output: string;
      if (!tool) {
        output = `Error: no existe la herramienta "${tc.name}".`;
      } else if (tool.mutates) {
        const ok = await deps.confirm(tool, tc.args);
        output = ok ? await Promise.resolve(tool.run(tc.args)) : 'El usuario canceló esta acción; no se realizó ningún cambio.';
      } else {
        output = await Promise.resolve(tool.run(tc.args));
      }
      msgs.push({ role: 'tool', toolCallId: tc.id, name: tc.name, text: output });
    }
  }

  return { messages: msgs, text: 'No pude terminar la tarea en varios pasos. ¿Puedes reformular lo que necesitas?' };
}
