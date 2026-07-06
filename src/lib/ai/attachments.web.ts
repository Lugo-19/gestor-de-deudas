/**
 * Stub web: adjuntar archivos solo funciona en la app del celular (los pickers y
 * la IA son nativos). En la vista previa web se muestra un aviso.
 */
import type { Attachment } from './providers/types';

function notAvailable(): never {
  throw new Error('solo-en-celular');
}

export async function takePhoto(): Promise<Attachment | null> {
  return notAvailable();
}

export async function pickImage(): Promise<Attachment | null> {
  return notAvailable();
}

export async function pickDocument(): Promise<Attachment | null> {
  return notAvailable();
}
