import { useEffect, useRef, useState, useCallback } from 'react';
import { protocolApi } from '../services/api';

interface UsePollingOptions {
  interval?: number; // Polling interval in milliseconds
  maxAttempts?: number; // Maximum number of polling attempts
  enabled?: boolean; // Enable/disable polling
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onMaxAttemptsReached?: () => void;
  shouldStopPolling?: (data: any) => boolean; // Custom condition to stop polling
}

export const usePolling = <T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions = {}
) => {
  const {
    interval = 5000,
    maxAttempts = 120,
    enabled = true,
    onSuccess,
    onError,
    onMaxAttemptsReached,
    shouldStopPolling,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    setIsPolling(true);
    setAttempts(0);
    setError(null);
  }, []);

  const poll = useCallback(async () => {
    if (!isMountedRef.current || !enabled) {
      return;
    }

    try {
      const result = await fetchFn();
      
      if (!isMountedRef.current) return;

      setData(result);
      setError(null);
      onSuccess?.(result);

      // Check if we should stop polling
      if (shouldStopPolling?.(result)) {
        stopPolling();
        return;
      }

      // Check max attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        stopPolling();
        onMaxAttemptsReached?.();
        return;
      }

      // Schedule next poll
      if (isMountedRef.current && enabled) {
        timeoutRef.current = setTimeout(poll, interval);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Polling failed');
      setError(error);
      onError?.(error);

      // Continue polling on error (unless max attempts reached)
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts < maxAttempts && enabled) {
        timeoutRef.current = setTimeout(poll, interval);
      } else {
        stopPolling();
        onMaxAttemptsReached?.();
      }
    }
  }, [
    fetchFn,
    enabled,
    attempts,
    interval,
    maxAttempts,
    shouldStopPolling,
    onSuccess,
    onError,
    onMaxAttemptsReached,
    stopPolling,
  ]);

  // Start polling when enabled
  useEffect(() => {
    if (enabled && !isPolling) {
      startPolling();
      poll();
    }

    return () => {
      stopPolling();
    };
  }, [enabled]); // Only re-run when enabled changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    data,
    error,
    isPolling,
    attempts,
    startPolling,
    stopPolling,
  };
};

export const useProtocolPolling = (
  threadId: string,
  options: Omit<UsePollingOptions, 'shouldStopPolling'> = {}
) => {
  return usePolling(
    () => protocolApi.getState(threadId),
    {
      ...options,
      shouldStopPolling: (data) => {
        // Stop polling when workflow is complete
        return (
          data?.approval_status === 'pending_human_review' ||
          data?.approval_status === 'approved' ||
          data?.approval_status === 'rejected'
        );
      },
    }
  );
};
