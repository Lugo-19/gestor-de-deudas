// babel-preset-expo ya configura automáticamente el plugin de Reanimated/Worklets
// al detectar la librería instalada (confirmado en la doc de Expo SDK 57).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
