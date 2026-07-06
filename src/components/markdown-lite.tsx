/**
 * Renderizador de Markdown MÍNIMO para las respuestas del asistente.
 *
 * Los modelos responden con un subconjunto de Markdown: **negrita**, *cursiva*,
 * `código`, viñetas (`- ` / `* `), listas numeradas (`1. `) y títulos (`# `).
 * Aquí se traduce a componentes `Text`/`View` temáticos, sin dependencias
 * externas (mismo criterio que el resto de la app: hecho a mano, robusto).
 */
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { parseInline, RE_BULLET, RE_HEADING, RE_NUMBER } from '@/lib/markdown';

function Inline({ text, color, size }: { text: string; color: string; size: number }) {
  const { colors, radius } = useTheme();
  return (
    <>
      {parseInline(text).map((s, i) => {
        const style: TextStyle = {};
        if (s.bold) style.fontWeight = '700';
        if (s.italic) style.fontStyle = 'italic';
        if (s.code) {
          return (
            <Text
              key={i}
              style={{
                fontFamily: 'monospace',
                fontSize: size - 1,
                color,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.sm,
              }}>
              {s.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={style}>
            {s.text}
          </Text>
        );
      })}
    </>
  );
}

export function MarkdownLite({
  text,
  color,
  size = 15,
}: {
  text: string;
  color: string;
  size?: number;
}) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const base: TextStyle = { color, fontSize: size, lineHeight: Math.round(size * 1.35), fontWeight: '500' };

  const blocks: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (line.trim() === '') {
      blocks.push(<View key={i} style={{ height: 6 }} />);
      return;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      blocks.push(
        <Text key={i} style={[base, { fontWeight: '700', fontSize: size + 2, marginTop: i > 0 ? 4 : 0 }]}>
          <Inline text={heading[2]} color={color} size={size + 2} />
        </Text>,
      );
      return;
    }

    const bullet = RE_BULLET.exec(line);
    if (bullet) {
      blocks.push(
        <View key={i} style={styles.row}>
          <Text style={[base, { fontWeight: '700' }]}>•  </Text>
          <Text style={[base, styles.flex]}>
            <Inline text={bullet[1]} color={color} size={size} />
          </Text>
        </View>,
      );
      return;
    }

    const numbered = RE_NUMBER.exec(line);
    if (numbered) {
      blocks.push(
        <View key={i} style={styles.row}>
          <Text style={[base, { fontWeight: '700' }]}>{numbered[1]}.  </Text>
          <Text style={[base, styles.flex]}>
            <Inline text={numbered[2]} color={color} size={size} />
          </Text>
        </View>,
      );
      return;
    }

    blocks.push(
      <Text key={i} style={base}>
        <Inline text={line} color={color} size={size} />
      </Text>,
    );
  });

  return <View style={{ gap: 2 }}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});
