// ==========================================================
// 📦 FINAL react-native.config.js — BulkSMS
// ----------------------------------------------------------
// React Native CLI Version : 0.76.9
// Platform Focus           : Android Only
// Module Detection         : Auto-linked (RN 0.71+ compliant)
//
// Notes:
// - "cli.package" is manually set to force the project to use
//   the updated CLI (12.x) instead of the legacy bundled plugin.
// - Prevents connect() .handle crash caused by mismatched CLI-plugin.
// - No `platforms.*` overrides (deprecated ≥ RN 0.71).
// - Hermes disabled in Gradle, not here.
// - SQLite, Kotlin native modules autolink normally.
//
// Safe, compliant, eliminates Metro startup crash.
// ==========================================================

module.exports = {
  project: {
    android: {
      sourceDir: "./android",
    },
  },

  // 🚫 Force Metro to use updated CLI, NOT legacy embedded plugin
  cli: {
    package: "@react-native-community/cli",
  },

  // No custom autolinking overrides
  dependencies: {},
};
