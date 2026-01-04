// Mock implementation of crypto for React Native
// This is to satisfy dependencies that import 'crypto' but don't strictly use it in the app (e.g. Lipana Webhooks)

module.exports = {
    randomBytes: (size) => {
        // If used, returns empty array. Add polyfill if actually needed.
        return new Uint8Array(size);
    },
    createHmac: (algo, key) => {
        const hmac = {
            update: () => hmac,
            digest: () => 'mock_digest'
        };
        return hmac;
    },
    createHash: (algo) => {
        const hash = {
            update: () => hash,
            digest: () => 'mock_digest'
        };
        return hash;
    }
};
