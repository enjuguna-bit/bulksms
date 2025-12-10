// ------------------------------------------------------
// 🛠️ src/polyfills.ts
// Standard React Native Polyfills
// ------------------------------------------------------

import "react-native-get-random-values";

// 1. TextEncoder / TextDecoder (Required by 'jose' and others)
// Native support in RN 0.76+ (Hermes/JSC) makes this polyfill redundant.

// 2. Crypto (Required by UUID and others)
// react-native-get-random-values provides crypto.getRandomValues polyfill
// No need for Node's crypto module - it doesn't exist in React Native

// 3. URL / URLSearchParams
// Removed react-native-url-polyfill as RN 0.76+ supports this natively.
