/**
 * Rate limiting utility.
 *
 * This file was a general-purpose concurrency toolkit — Mutex, Semaphore,
 * ReadWriteLock, AtomicCounter, ConcurrentMap, ConcurrentArray, debounce and
 * CircuitBreaker, ~540 lines. Nothing in the generator or the Pro packs called any
 * of it; the only live export is RateLimiter, used by utils/dosProtection.ts.
 * (Mutex had one caller, utils/transactionSafety.ts, which was itself unreachable
 * and has been removed.)
 */

/**
 * Rate limiter for controlling request frequency
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill = Date.now();

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private refillPeriod: number = 1000, // milliseconds
  ) {
    this.tokens = capacity;
  }

  async acquire(tokensRequested = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.refillPeriod) * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  available(): number {
    this.refill();
    return this.tokens;
  }
}
