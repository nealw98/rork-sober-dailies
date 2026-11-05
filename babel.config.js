module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
          },
        },
      ],
      // Reanimated/worklets transform is applied automatically by
      // babel-preset-expo since SDK 54 — no manual plugin entry.
    ],
  };
};