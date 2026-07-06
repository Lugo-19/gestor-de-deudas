/**
 * Diálogo de confirmación con diseño propio (no el Alert del sistema).
 * Se usa vía el hook imperativo `useConfirm()`, que devuelve una promesa:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: '¿Eliminar?', destructive: true })) { ...borrar... }
 *
 * El proveedor vive junto a <ThemeProvider> (necesita `useTheme`).
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { withAlpha } from '@/theme/palette';
import { Button, Card, Txt } from './ui';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si true, el botón de confirmar usa la variante 'danger' (rojo). */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={opts != null} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: withAlpha(colors.shadow, 0.45),
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}>
          {opts ? (
            <Card style={{ width: '100%', maxWidth: 380, gap: 8 }}>
              <Txt variant="title">{opts.title}</Txt>
              {opts.message ? <Txt variant="body" muted>{opts.message}</Txt> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button title={opts.cancelLabel ?? 'Cancelar'} variant="secondary" onPress={() => close(false)} fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={opts.confirmLabel ?? 'Eliminar'}
                    variant={opts.destructive ? 'danger' : 'primary'}
                    onPress={() => close(true)}
                    fullWidth
                  />
                </View>
              </View>
            </Card>
          ) : null}
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
