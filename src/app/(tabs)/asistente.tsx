import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowUp, Camera, FileText, Image as ImageIcon, Paperclip, RefreshCw, RotateCw, Settings2, Sparkles, X,
} from 'lucide-react-native';

import { Button, Card, IconBubble, Txt } from '@/components/ui';
import { MarkdownLite } from '@/components/markdown-lite';
import { useConfirm } from '@/components/confirm-dialog';
import { useTheme } from '@/theme/theme-provider';
import { runAgent } from '@/lib/ai/agent';
import { loadAiConfig } from '@/lib/ai/config';
import { buildFinancialSnapshot, buildSystemPrompt } from '@/lib/ai/context';
import { pickDocument, pickImage, takePhoto } from '@/lib/ai/attachments';
import type { Attachment, NormMessage } from '@/lib/ai/providers/types';

const SUGGESTIONS = [
  '¿Cuánto puedo gastar hoy?',
  '¿En qué gasto más este mes?',
  'Registra un gasto de 20000 en comida',
  '¿Cuánto debo en total?',
];

/** Traduce los códigos de error de los pickers a un aviso amable. */
function attachErrorMessage(e: unknown): string {
  const code = String((e as any)?.message ?? '');
  if (code === 'sin-permiso-camara') return 'Necesito permiso para usar la cámara. Actívalo en los ajustes del teléfono.';
  if (code === 'sin-permiso-galeria') return 'Necesito permiso para ver tus fotos. Actívalo en los ajustes del teléfono.';
  if (code === 'solo-en-celular') return 'Adjuntar archivos solo funciona en la app del celular.';
  return 'No pude abrir el archivo. Inténtalo de nuevo.';
}

export default function Asistente() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const confirm = useConfirm();

  const [transcript, setTranscript] = useState<NormMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastBase = useRef<NormMessage[] | null>(null);

  useEffect(() => {
    loadAiConfig().then((c) => setHasKey(!!c.apiKey));
  }, []);

  const visible = transcript.filter(
    (m) => m.role === 'user' || (m.role === 'assistant' && m.text),
  );

  /** Ejecuta el agente sobre una conversación base (reutilizable para reintentar). */
  async function runFrom(base: NormMessage[]) {
    lastBase.current = base;
    setFailed(false);
    setBusy(true);
    // Muestra el mensaje del usuario de inmediato; luego aparece "Pensando…".
    setTranscript(base);
    try {
      const config = await loadAiConfig();
      if (!config.apiKey) {
        setHasKey(false);
        return;
      }
      const system = buildSystemPrompt(buildFinancialSnapshot());
      const { messages } = await runAgent(base, {
        config,
        system,
        confirm: (tool, args) =>
          confirm({
            title: tool.describe?.(args) ?? '¿Confirmar acción?',
            message: 'El asistente quiere realizar esta acción en tus datos.',
            confirmLabel: 'Sí, hazlo',
            cancelLabel: 'No',
            destructive: tool.name.startsWith('eliminar'),
          }),
      });
      setTranscript(messages);
    } catch {
      // Ya se reintentó dentro del agente; mostramos aviso amable con "Reintentar".
      setTranscript(base);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (busy) return;
    if (!text && !attachments.length) return;
    const finalText = text || 'Analiza este archivo y propón los movimientos que correspondan.';
    setInput('');
    setMenuOpen(false);
    const msg: NormMessage = { role: 'user', text: finalText };
    if (attachments.length) msg.attachments = attachments;
    setAttachments([]);
    runFrom([...transcript, msg]);
  }

  /** Abre un picker, añade el adjunto y maneja permisos/errores. */
  async function attach(pick: () => Promise<Attachment | null>) {
    setMenuOpen(false);
    try {
      const att = await pick();
      if (att) setAttachments((prev) => [...prev, att]);
    } catch (e) {
      Alert.alert('Adjuntar', attachErrorMessage(e));
    }
  }

  const canSend = (!!input.trim() || attachments.length > 0) && !busy;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior="padding"
      keyboardVerticalOffset={0}>
      {/* Cabecera */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBubble color={colors.accent} size={40}><Sparkles size={20} color={colors.accent} /></IconBubble>
        <View style={{ flex: 1 }}>
          <Txt variant="title" style={{ fontSize: 22 }}>Asistente</Txt>
          <Txt variant="caption" faint>Pregúntame, adjunta un recibo o pídeme registrar algo</Txt>
        </View>
        {transcript.length > 0 && (
          <Pressable onPress={() => setTranscript([])} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
            <RefreshCw size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Sin llave configurada */}
      {hasKey === false ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <Card style={{ gap: 12, alignItems: 'center' }}>
            <IconBubble color={colors.accent} size={56}><Sparkles size={26} color={colors.accent} /></IconBubble>
            <Txt variant="subtitle" style={{ textAlign: 'center' }}>Configura tu asistente</Txt>
            <Txt variant="body" muted style={{ textAlign: 'center' }}>
              Elige un proveedor de IA y pega tu llave en Ajustes. Con Gemini puedes empezar gratis.
            </Txt>
            <Button title="Ir a Ajustes" icon={<Settings2 size={18} color={colors.onAccent} />} onPress={() => router.push('/ajustes')} fullWidth />
          </Card>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}>
            {visible.length === 0 ? (
              <View style={{ paddingTop: 24, gap: 10 }}>
                <Txt variant="caption" faint style={{ paddingHorizontal: 6 }}>Prueba con:</Txt>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14 }}>
                    <Txt variant="body">{s}</Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              visible.map((m, i) => (
                <Bubble key={i} role={m.role as 'user' | 'assistant'} text={m.text ?? ''} attachments={m.attachments} />
              ))
            )}
            {busy && (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14 }}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Txt variant="caption" faint>Pensando…</Txt>
              </View>
            )}
            {failed && !busy && (
              <View style={{ alignSelf: 'stretch', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 10 }}>
                <Txt variant="body" muted>
                  Parece que el asistente está teniendo problemas en este momento. Inténtalo de nuevo en unos segundos.
                </Txt>
                <Pressable
                  onPress={() => lastBase.current && runFrom(lastBase.current)}
                  style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.accent }}>
                  <RotateCw size={16} color={colors.onAccent} />
                  <Txt variant="label" color={colors.onAccent}>Reintentar</Txt>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Menú de adjuntar */}
          {menuOpen && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
              <AttachOption icon={<Camera size={20} color={colors.accent} />} label="Tomar foto" onPress={() => attach(takePhoto)} />
              <AttachOption icon={<ImageIcon size={20} color={colors.accent} />} label="Elegir imagen" onPress={() => attach(pickImage)} />
              <AttachOption icon={<FileText size={20} color={colors.accent} />} label="Elegir PDF" onPress={() => attach(pickDocument)} />
            </View>
          )}

          {/* Adjuntos pendientes de enviar */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
              {attachments.map((a, i) => (
                <AttachChip
                  key={i}
                  att={a}
                  onRemove={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </ScrollView>
          )}

          {/* Barra de entrada */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
            <Pressable
              onPress={() => setMenuOpen((v) => !v)}
              disabled={busy}
              style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: menuOpen ? colors.accent : colors.surfaceAlt }}>
              <Paperclip size={20} color={menuOpen ? colors.onAccent : colors.textMuted} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escribe tu mensaje…"
              placeholderTextColor={colors.textFaint}
              multiline
              editable={!busy}
              onSubmitEditing={() => send()}
              style={{ flex: 1, maxHeight: 120, minHeight: 46, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: colors.text, fontSize: 15 }}
            />
            <Pressable
              onPress={() => send()}
              disabled={!canSend}
              style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? colors.accent : colors.surfaceAlt }}>
              <ArrowUp size={22} color={canSend ? colors.onAccent : colors.textFaint} strokeWidth={2.6} />
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function AttachOption({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14 }}>
      {icon}
      <Txt variant="body">{label}</Txt>
    </Pressable>
  );
}

function AttachChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  const { colors, radius } = useTheme();
  const isImage = att.kind === 'image';
  return (
    <View style={{ width: 72, height: 72, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {isImage ? (
        <Image source={{ uri: `data:${att.mimeType};base64,${att.data}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
          <FileText size={24} color={colors.textMuted} />
          <Txt variant="caption" faint numberOfLines={1} style={{ maxWidth: 64 }}>PDF</Txt>
        </View>
      )}
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <X size={13} color="#fff" strokeWidth={3} />
      </Pressable>
    </View>
  );
}

function Bubble({ role, text, attachments }: { role: 'user' | 'assistant'; text: string; attachments?: Attachment[] }) {
  const { colors, radius } = useTheme();
  const isUser = role === 'user';
  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        backgroundColor: isUser ? colors.accent : colors.surface,
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
      }}>
      {attachments?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {attachments.map((a, i) =>
            a.kind === 'image' ? (
              <Image
                key={i}
                source={{ uri: `data:${a.mimeType};base64,${a.data}` }}
                style={{ width: 120, height: 120, borderRadius: radius.md }}
                resizeMode="cover"
              />
            ) : (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 }}>
                <FileText size={16} color={isUser ? colors.onAccent : colors.textMuted} />
                <Txt variant="caption" color={isUser ? colors.onAccent : colors.textMuted} numberOfLines={1} style={{ maxWidth: 160 }}>
                  {a.name ?? 'documento.pdf'}
                </Txt>
              </View>
            ),
          )}
        </View>
      ) : null}
      {!!text &&
        (isUser ? (
          <Txt variant="body" color={colors.onAccent}>{text}</Txt>
        ) : (
          <MarkdownLite text={text} color={colors.text} />
        ))}
    </View>
  );
}
