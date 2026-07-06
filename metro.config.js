// Configuración de Metro. Añade soporte para el .wasm de expo-sqlite (SQLite en
// WebAssembly) para poder correr la app en el navegador durante el desarrollo.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
