// =============================================================
// 📦 FINAL metro.config.js — BulkSMS
// -------------------------------------------------------------
// React Native         0.76.x
// Metro Bundler        0.81.x
// OS                   Windows + Android
// Hermes               ENABLED (Matches android/app/build.gradle)
//
// Clean, stable, crash-safe.
// Fully compatible with RN new CLI & Metro migration.
// =============================================================

const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

const customConfig = {
  resolver: {
    // Allow "cjs" modules
    sourceExts: [...defaultConfig.resolver.sourceExts, "cjs"],

    // Handle alias mapping "@" → "src"
    extraNodeModules: {
      ...(defaultConfig.resolver.extraNodeModules || {}),
      "@": path.resolve(__dirname, "src"),
      "crypto": path.resolve(__dirname, "mocks/crypto.js"),
    },

    // Let Metro search normally
    disableHierarchicalLookup: false,
  },

  transformer: {
    // ⚠ Required for RN 0.76+ / Metro 0.81 compatibility
    unstable_allowRequireContext: false,

    // Recommended config for Hermes
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },

  // Recommended watch root
  // Ensures paths resolve properly on Windows
  watchFolders: [path.resolve(__dirname)],
};

// Export final config
module.exports = mergeConfig(defaultConfig, customConfig);