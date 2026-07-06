/**
 * VARIANTE WEB (solo para vista previa en navegador durante el desarrollo).
 * El navegador no soporta el SQLite síncrono de expo-sqlite (requiere
 * SharedArrayBuffer). Aquí no se usa base de datos real: los datos vienen de
 * `hooks.web.ts` (ejemplos en memoria). El móvil sigue usando `client.ts` real.
 */
const chain: any = new Proxy(() => chain, { get: () => chain, apply: () => chain });

export const DB_NAME = 'appcuentas.db';
export const db: any = chain;
export const expoDb: any = {};
export function initSchema() {}
