import { useState, useEffect } from 'react';

interface UseRateLimitResult {
  readonly isLocked: boolean;
  readonly lockCountdown: number;
  readonly recordFailure: () => string | null;
  readonly resetAttempts: () => void;
}

/**
 * Tracks consecutive failed attempts and triggers a timed lockout
 * after `maxAttempts`. Returns a lockout message when threshold is
 * reached, or null if under the limit.
 */
export function useRateLimit(maxAttempts: number, lockoutMs: number): UseRateLimitResult {
  const [attempts, setAttempts] = useState(0);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (lockCountdown <= 0) return;
    const timer = setTimeout(() => {
      setLockCountdown((prev) => prev - 1);
    }, 1000);
    return (): void => {
      clearTimeout(timer);
    };
  }, [lockCountdown]);

  const isLocked = lockCountdown > 0;

  const recordFailure = (): string | null => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= maxAttempts) {
      const lockSeconds = lockoutMs / 1000;
      setLockCountdown(lockSeconds);
      setAttempts(0);
      return `Too many failed attempts. Try again in ${lockSeconds} seconds.`;
    }
    return null;
  };

  const resetAttempts = (): void => {
    setAttempts(0);
  };

  return { isLocked, lockCountdown, recordFailure, resetAttempts };
}
