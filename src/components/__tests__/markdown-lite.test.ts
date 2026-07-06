/**
 * Verifica el parseo inline del Markdown ligero del asistente (negrita/cursiva/
 * código y texto plano). El renderizado de bloques (viñetas/títulos) es JSX.
 */
import { parseInline } from '@/lib/markdown';

describe('parseInline', () => {
  it('detecta negrita **texto**', () => {
    expect(parseInline('Hola **Título** fin')).toEqual([
      { text: 'Hola ' },
      { text: 'Título', bold: true },
      { text: ' fin' },
    ]);
  });

  it('detecta cursiva *texto* sin confundir con negrita', () => {
    expect(parseInline('un *dato* aquí')).toEqual([
      { text: 'un ' },
      { text: 'dato', italic: true },
      { text: ' aquí' },
    ]);
  });

  it('detecta código `x`', () => {
    expect(parseInline('usa `run` ya')).toEqual([
      { text: 'usa ' },
      { text: 'run', code: true },
      { text: ' ya' },
    ]);
  });

  it('texto sin formato queda en un solo segmento', () => {
    expect(parseInline('solo texto')).toEqual([{ text: 'solo texto' }]);
  });

  it('combina varios formatos en una línea', () => {
    const out = parseInline('**A** y *B*');
    expect(out).toEqual([
      { text: 'A', bold: true },
      { text: ' y ' },
      { text: 'B', italic: true },
    ]);
  });
});
