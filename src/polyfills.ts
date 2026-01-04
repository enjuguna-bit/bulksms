// ------------------------------------------------------
// 🛠️ src/polyfills.ts
// Standard React Native Polyfills
// ------------------------------------------------------

import "react-native-get-random-values";

// 1. TextEncoder / TextDecoder (Required by 'jose' and others)
// Native support in RN 0.76+ (Hermes/JSC) makes this polyfill redundant.

// 2. Crypto module mock for libraries that require 'crypto'
// Libraries like @lipana/sdk may try to require Node's crypto module
// This mock satisfies their require() calls with stub implementations
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.crypto = require('./mocks/crypto.js');
}

// react-native-get-random-values provides crypto.getRandomValues polyfill
// This ensures cryptographic operations have the polyfill they need

// 3. URL / URLSearchParams
// Removed react-native-url-polyfill as RN 0.76+ supports this natively.
