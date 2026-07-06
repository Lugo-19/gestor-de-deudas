/**
 * Parseo de un subconjunto de Markdown (lógica pura, sin dependencias de UI).
 * Lo usa `components/markdown-lite.tsx` para renderizar las respuestas del
 * asistente. Separado para poder testearlo sin arrastrar el tema/BD.
 */
export type Seg = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

/** Divide una línea en segmentos con formato (negrita/cursiva/código). */
export function parseInline(input: string): Seg[] {
  const segs: Seg[] = [];
  // Orden importa: **negrita** antes que *cursiva*.
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) segs.push({ text: input.slice(last, m.index) });
    if (m[2] !== undefined) segs.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) segs.push({ text: m[3], italic: true });
    else if (m[4] !== undefined) segs.push({ text: m[4], code: true });
    last = re.lastIndex;
  }
  if (last < input.length) segs.push({ text: input.slice(last) });
  return segs.length ? segs : [{ text: input }];
}

export const RE_BULLET = /^\s*[-*•]\s+(.*)$/;
export const RE_NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;
export const RE_HEADING = /^\s*(#{1,3})\s+(.*)$/;
