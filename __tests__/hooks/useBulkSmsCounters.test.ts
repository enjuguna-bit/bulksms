import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useBulkSmsCounters } from '@/hooks/useBulkSmsCounters';

// Mock any dependencies if needed
jest.mock('@/services/storage', () => ({
  saveSendLog: jest.fn(),
}));

describe('useBulkSmsCounters', () => {
  it('initializes with zero counters', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    expect(result.current.sent).toBe(0);
    expect(result.current.failed).toBe(0);
    expect(result.current.queued).toBe(0);
  });

  it('increments sent counter', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    act(() => {
      result.current.incrementSent();
    });

    expect(result.current.sent).toBe(1);
    expect(result.current.sentRef.current).toBe(1);
  });

  it('increments failed counter', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    act(() => {
      result.current.incrementFailed();
    });

    expect(result.current.failed).toBe(1);
    expect(result.current.failedRef.current).toBe(1);
  });

  it('increments queued counter', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    act(() => {
      result.current.incrementQueued();
    });

    expect(result.current.queued).toBe(1);
    expect(result.current.queuedRef.current).toBe(1);
  });

  it('resets all counters', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    act(() => {
      result.current.incrementSent();
      result.current.incrementFailed();
      result.current.incrementQueued();
      result.current.resetCounters();
    });

    expect(result.current.sent).toBe(0);
    expect(result.current.failed).toBe(0);
    expect(result.current.queued).toBe(0);
    expect(result.current.sentRef.current).toBe(0);
    expect(result.current.failedRef.current).toBe(0);
    expect(result.current.queuedRef.current).toBe(0);
  });

  it('flushes counters to sync state with refs', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    // Directly modify refs to simulate async operations
    act(() => {
      result.current.sentRef.current = 5;
      result.current.failedRef.current = 3;
      result.current.queuedRef.current = 2;
      result.current.flushCounters();
    });

    expect(result.current.sent).toBe(5);
    expect(result.current.failed).toBe(3);
    expect(result.current.queued).toBe(2);
  });

  it('maintains counter independence', () => {
    const { result } = renderHook(() => useBulkSmsCounters());

    act(() => {
      result.current.incrementSent();
      result.current.incrementSent();
      result.current.incrementFailed();
    });

    expect(result.current.sent).toBe(2);
    expect(result.current.failed).toBe(1);
    expect(result.current.queued).toBe(0);
  });
});
