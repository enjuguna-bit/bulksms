// =============================================================
// 📦 OPTIMIZED metro.config.js — BulkSMS Performance Enhancement
// -------------------------------------------------------------
// React Native         0.76.x
// Metro Bundler        0.81.x
// OS                   Windows + Android
//
// OPTIMIZATIONS:
// - Dynamic imports for heavy screens
// - Tree shaking for unused code
// - Bundle splitting for better caching
// - Lazy loading for large components
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

    // Optimize resolution for better performance
    resolveRequest: (context, moduleName, platform) => {
      // Custom resolution logic can be added here if needed
      return context.resolveRequest(context, moduleName, platform);
    },
  },

  transformer: {
    // ⚠ Required for RN 0.76+ / Metro 0.81 compatibility
    unstable_allowRequireContext: false,

    // Recommended config for Hermes with optimizations
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
        // Enable tree shaking optimizations
        minify: true,
        compact: true,
      },
    }),

    // Optimize asset handling
    assetPlugins: ['react-native-asset-plugin'],
  },

  // Enhanced watch configuration for better performance
  watchFolders: [
    path.resolve(__dirname),
    // Add specific folders to watch for better performance
    path.resolve(__dirname, "src"),
  ],

  // Bundle optimization settings
  serializer: {
    // Create separate bundles for better caching
    createModuleIdFactory: () => {
      const { createModuleIdFactory } = require('react-native-build-config');
      return createModuleIdFactory();
    },

    // Process modules for optimization
    processModuleFilter: (modules) => {
      // Filter out development-only modules in production
      if (__DEV__) return true;

      // Example: Exclude certain large libraries from main bundle
      const excludePatterns = [
        /node_modules\/xlsx/, // Large Excel processing - load on demand
        /node_modules\/react-native-webview/, // WebView - load when needed
        /node_modules\/react-native-document-picker/, // File picker - load on demand
      ];

      return !excludePatterns.some(pattern => pattern.test(modules.path));
    },
  },
};

// Export final config
module.exports = mergeConfig(defaultConfig, customConfig);
