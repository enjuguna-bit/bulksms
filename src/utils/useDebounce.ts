// ------------------------------------------------------
// ⏳ src/utils/useDebounce.ts
// Simple debounce hook for any state or input
// ------------------------------------------------------

import { useState, useEffect } from 'react';

/**
 * ✅ useDebounce Hook
 * - Delays updates by `delay` ms to prevent unnecessary renders.
 * - Works with any data type.
 * - Fully cleanup-safe for React Native CLI apps.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
