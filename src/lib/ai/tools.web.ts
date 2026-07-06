/**
 * VARIANTE WEB (vista previa): mismas firmas que `tools.ts`, pero las lecturas
 * devuelven datos de ejemplo y las escrituras son no-op (no hay SQLite en web).
 */
import type { ToolDef } from './tools';

export type { ToolDef } from './tools';

export const TOOLS: ToolDef[] = [
  {
    name: 'resumen_financiero',
    description: 'Resumen del período (vista previa).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    mutates: false,
    run: () => 'Disponible: $1.744.000 · Deuda total: $8.200.000 (datos de ejemplo).',
  },
];

export function getTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}
