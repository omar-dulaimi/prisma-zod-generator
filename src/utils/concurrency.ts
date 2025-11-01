/**
 * Concurrency Control Utilities
 *
 * Provides mutex, semaphore, and atomic operation utilities
 * to prevent race conditions in PZG Pro
 */

export interface MutexLock {
  release(): void;
}

/**
 * Simple mutex implementation for async operations
 */
export class Mutex {
  private locked = false;
  private waitQueue: Array<(lock: MutexLock) => void> = [];

  async acquire(): Promise<MutexLock> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(this.createLock());
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  private createLock(): MutexLock {
    return {
      release: () => {
        if (this.waitQueue.length > 0) {
          const next = this.waitQueue.shift()!;
          next(this.createLock());
        } else {
          this.locked = false;
        }
      },
    };
  }

  isLocked(): boolean {
    return this.locked;
  }
}

/**
 * Semaphore for limiting concurrent operations
 */
export class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next();
    }
  }

  available(): number {
    return this.permits;
  }
}

/**
 * Read-Write lock for concurrent read access
 */
export class ReadWriteLock {
  private readers = 0;
  private writers = 0;
  private readWaitQueue: Array<() => void> = [];
  private writeWaitQueue: Array<() => void> = [];

  async acquireRead(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.writers === 0 && this.writeWaitQueue.length === 0) {
        this.readers++;
        resolve(() => this.releaseRead());
      } else {
        this.readWaitQueue.push(() => {
          this.readers++;
          resolve(() => this.releaseRead());
        });
      }
    });
  }

  async acquireWrite(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.readers === 0 && this.writers === 0) {
        this.writers++;
        resolve(() => this.releaseWrite());
      } else {
        this.writeWaitQueue.push(() => {
          this.writers++;
          resolve(() => this.releaseWrite());
        });
      }
    });
  }

  private releaseRead(): void {
    this.readers--;
    if (this.readers === 0 && this.writeWaitQueue.length > 0) {
      const next = this.writeWaitQueue.shift()!;
      next();
    }
  }

  private releaseWrite(): void {
    this.writers--;

    // Prioritize writers if any are waiting
    if (this.writeWaitQueue.length > 0) {
      const next = this.writeWaitQueue.shift()!;
      next();
    } else {
      // Release all waiting readers
      while (this.readWaitQueue.length > 0) {
        const next = this.readWaitQueue.shift()!;
        next();
      }
    }
  }
}

/**
 * Atomic counter for safe increment/decrement operations
 */
export class AtomicCounter {
  private value = 0;
  private mutex = new Mutex();

  async increment(): Promise<number> {
    const lock = await this.mutex.acquire();
    try {
      return ++this.value;
    } finally {
      lock.release();
    }
  }

  async decrement(): Promise<number> {
    const lock = await this.mutex.acquire();
    try {
      return --this.value;
    } finally {
      lock.release();
    }
  }

  async get(): Promise<number> {
    const lock = await this.mutex.acquire();
    try {
      return this.value;
    } finally {
      lock.release();
    }
  }

  async set(newValue: number): Promise<void> {
    const lock = await this.mutex.acquire();
    try {
      this.value = newValue;
    } finally {
      lock.release();
    }
  }

  async compareAndSwap(expected: number, newValue: number): Promise<boolean> {
    const lock = await this.mutex.acquire();
    try {
      if (this.value === expected) {
        this.value = newValue;
        return true;
      }
      return false;
    } finally {
      lock.release();
    }
  }
}

/**
 * Thread-safe Map implementation
 */
export class ConcurrentMap<K, V> {
  private map = new Map<K, V>();
  private rwLock = new ReadWriteLock();

  async get(key: K): Promise<V | undefined> {
    const release = await this.rwLock.acquireRead();
    try {
      return this.map.get(key);
    } finally {
      release();
    }
  }

  async set(key: K, value: V): Promise<void> {
    const release = await this.rwLock.acquireWrite();
    try {
      this.map.set(key, value);
    } finally {
      release();
    }
  }

  async delete(key: K): Promise<boolean> {
    const release = await this.rwLock.acquireWrite();
    try {
      return this.map.delete(key);
    } finally {
      release();
    }
  }

  async has(key: K): Promise<boolean> {
    const release = await this.rwLock.acquireRead();
    try {
      return this.map.has(key);
    } finally {
      release();
    }
  }

  async size(): Promise<number> {
    const release = await this.rwLock.acquireRead();
    try {
      return this.map.size;
    } finally {
      release();
    }
  }

  async keys(): Promise<K[]> {
    const release = await this.rwLock.acquireRead();
    try {
      return Array.from(this.map.keys());
    } finally {
      release();
    }
  }

  async values(): Promise<V[]> {
    const release = await this.rwLock.acquireRead();
    try {
      return Array.from(this.map.values());
    } finally {
      release();
    }
  }

  async entries(): Promise<[K, V][]> {
    const release = await this.rwLock.acquireRead();
    try {
      return Array.from(this.map.entries());
    } finally {
      release();
    }
  }

  async clear(): Promise<void> {
    const release = await this.rwLock.acquireWrite();
    try {
      this.map.clear();
    } finally {
      release();
    }
  }

  async forEach(callback: (value: V, key: K) => void): Promise<void> {
    const release = await this.rwLock.acquireRead();
    try {
      this.map.forEach(callback);
    } finally {
      release();
    }
  }

  /**
   * Atomic update operation - ensures consistency
   */
  async update(key: K, updater: (current: V | undefined) => V): Promise<V> {
    const release = await this.rwLock.acquireWrite();
    try {
      const current = this.map.get(key);
      const updated = updater(current);
      this.map.set(key, updated);
      return updated;
    } finally {
      release();
    }
  }

  /**
   * Atomic upsert operation
   */
  async upsert(key: K, initial: V, updater: (current: V) => V): Promise<V> {
    const release = await this.rwLock.acquireWrite();
    try {
      const current = this.map.get(key);
      const value = current ? updater(current) : initial;
      this.map.set(key, value);
      return value;
    } finally {
      release();
    }
  }
}

/**
 * Thread-safe Array implementation
 */
export class ConcurrentArray<T> {
  private array: T[] = [];
  private mutex = new Mutex();

  async push(...items: T[]): Promise<number> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.push(...items);
    } finally {
      lock.release();
    }
  }

  async pop(): Promise<T | undefined> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.pop();
    } finally {
      lock.release();
    }
  }

  async shift(): Promise<T | undefined> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.shift();
    } finally {
      lock.release();
    }
  }

  async unshift(...items: T[]): Promise<number> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.unshift(...items);
    } finally {
      lock.release();
    }
  }

  async length(): Promise<number> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.length;
    } finally {
      lock.release();
    }
  }

  async get(index: number): Promise<T | undefined> {
    const lock = await this.mutex.acquire();
    try {
      return this.array[index];
    } finally {
      lock.release();
    }
  }

  async set(index: number, value: T): Promise<void> {
    const lock = await this.mutex.acquire();
    try {
      this.array[index] = value;
    } finally {
      lock.release();
    }
  }

  async slice(start?: number, end?: number): Promise<T[]> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.slice(start, end);
    } finally {
      lock.release();
    }
  }

  async filter(predicate: (value: T, index: number) => boolean): Promise<T[]> {
    const lock = await this.mutex.acquire();
    try {
      return this.array.filter(predicate);
    } finally {
      lock.release();
    }
  }

  async forEach(callback: (value: T, index: number) => void): Promise<void> {
    const lock = await this.mutex.acquire();
    try {
      this.array.forEach(callback);
    } finally {
      lock.release();
    }
  }

  async clear(): Promise<void> {
    const lock = await this.mutex.acquire();
    try {
      this.array.length = 0;
    } finally {
      lock.release();
    }
  }

  /**
   * Atomic batch operation
   */
  async batch<R>(operation: (array: T[]) => R): Promise<R> {
    const lock = await this.mutex.acquire();
    try {
      return operation(this.array);
    } finally {
      lock.release();
    }
  }
}

/**
 * Debounce utility for preventing rapid successive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let resolvePromise: ((value: ReturnType<T>) => void) | null = null;
  let rejectPromise: ((error: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolvePromise = resolve;
      rejectPromise = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolvePromise?.(result);
        } catch (error) {
          rejectPromise?.(error);
        }
      }, delay);
    });
  };
}

/**
 * Circuit breaker pattern for fault tolerance
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private nextAttempt = 0;
  private successCount = 0;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private monitoringPeriod: number = 10000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
  }
}

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
