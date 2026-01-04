import { useState, useEffect, useCallback } from "react";
import {
  bufferIncomingSms,
  processBufferedMessages,
  getBufferStats,
  scheduleBufferProcessing,
} from "@/services/incomingSmsProcessor";
import Logger from "@/utils/logger";

/**
 * Optimized hook for managing SMS buffer operations
 * Reduces polling frequency and improves performance
 */
export function useSmsBufferManager() {
  const [bufferStats, setBufferStats] = useState<{ pending: number; oldest: number | null }>({
    pending: 0,
    oldest: null,
  });
  const [bufferError, setBufferError] = useState<string | null>(null);

  // Buffer incoming SMS with error handling
  const bufferIncomingSmsWithError = useCallback(async (body: string, phone: string) => {
    try {
      await bufferIncomingSms(body, phone);
      setBufferError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown buffer error';
      setBufferError(message);
      Logger.error('useSmsBufferManager', 'Failed to buffer SMS', error);
      throw error; // Re-throw for caller handling
    }
  }, []);

  // Process buffered messages with error handling
  const processBufferedMessagesWithError = useCallback(async () => {
    try {
      await processBufferedMessages();
      setBufferError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      setBufferError(message);
      Logger.error('useSmsBufferManager', 'Failed to process buffered messages', error);
      throw error;
    }
  }, []);

  // Optimized buffer stats polling - less frequent, with error recovery
  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const pollStats = async () => {
      try {
        const stats = await getBufferStats();
        if (!mounted) return;

        setBufferStats(stats);
        setBufferError(null);

        // Warn only for significant backlogs
        if (stats.pending > 100) {
          Logger.warn(
            'useSmsBufferManager',
            `SMS buffer backlog detected (pending=${stats.pending}, oldest=${stats.oldest})`
          );
        }
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unknown buffer stats error';
        setBufferError(message);
        Logger.error('useSmsBufferManager', 'Failed to read buffer stats', error);
      }
    };

    // Initial poll
    pollStats();

    // Poll every 30 seconds instead of 15 (reduced frequency)
    pollInterval = setInterval(pollStats, 30000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Ensure buffered messages are processed even if listener misses events
  useEffect(() => {
    const stopScheduler = scheduleBufferProcessing(15000); // Increased from 8000ms
    return () => {
      stopScheduler?.();
    };
  }, []);

  return {
    bufferStats,
    bufferError,
    bufferIncomingSms: bufferIncomingSmsWithError,
    processBufferedMessages: processBufferedMessagesWithError,
  };
}
