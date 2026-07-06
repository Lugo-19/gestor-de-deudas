/**
 * Selección de adjuntos para el asistente: foto (cámara), imagen (galería) o PDF.
 * Devuelve `Attachment` en base64 listo para enviar a cualquier proveedor.
 *
 * Las funciones lanzan errores con códigos simples ('sin-permiso-*') que la UI
 * traduce a un aviso amable; nunca se loguea el contenido.
 */
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import type { Attachment } from './providers/types';

/** Tipos de imagen que aceptan los tres proveedores. */
const OK_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Normaliza el tipo MIME a uno soportado. Con `quality < 1` la app re-codifica a
 * JPEG en iOS, así que HEIC u otros no soportados se tratan como JPEG.
 */
function imageMime(asset: ImagePicker.ImagePickerAsset): string {
  const m = (asset.mimeType ?? '').toLowerCase();
  if (OK_IMAGE.includes(m)) return m;
  const s = (asset.fileName ?? asset.uri ?? '').toLowerCase();
  if (s.endsWith('.png')) return 'image/png';
  if (s.endsWith('.webp')) return 'image/webp';
  if (s.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function toImageAttachment(asset: ImagePicker.ImagePickerAsset): Attachment | null {
  if (!asset.base64) return null;
  return {
    kind: 'image',
    mimeType: imageMime(asset),
    data: asset.base64,
    name: asset.fileName ?? undefined,
  };
}

/** Toma una foto con la cámara (para recibos en papel). */
export async function takePhoto(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('sin-permiso-camara');
  const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
  if (res.canceled || !res.assets?.length) return null;
  return toImageAttachment(res.assets[0]);
}

/** Elige una imagen de la galería. */
export async function pickImage(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('sin-permiso-galeria');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
  if (res.canceled || !res.assets?.length) return null;
  return toImageAttachment(res.assets[0]);
}

/** Elige un PDF del dispositivo. */
export async function pickDocument(): Promise<Attachment | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const data = await new File(asset.uri).base64();
  return { kind: 'document', mimeType: 'application/pdf', data, name: asset.name ?? 'documento.pdf' };
}
