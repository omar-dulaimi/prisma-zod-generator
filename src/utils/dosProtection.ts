/**
 * DoS Protection Utilities
 *
 * Comprehensive protection against resource exhaustion and DoS attacks
 * for PZG Pro features
 */

import { RateLimiter } from './concurrency';

export interface ResourceLimits {
  maxFileSize: number; // bytes
  maxMemoryUsage: number; // bytes
  maxExecutionTime: number; // milliseconds
  maxIterations: number;
  maxRecursionDepth: number;
  maxArrayLength: number;
  maxStringLength: number;
  maxJSONDepth: number;
  maxJSONSize: number;
  maxConcurrentOperations: number;
}

export const DEFAULT_LIMITS: ResourceLimits = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxMemoryUsage: 500 * 1024 * 1024, // 500MB
  maxExecutionTime: 30000, // 30 seconds
  maxIterations: 10000,
  maxRecursionDepth: 100,
  maxArrayLength: 10000,
  maxStringLength: 1024 * 1024, // 1MB
  maxJSONDepth: 20,
  maxJSONSize: 10 * 1024 * 1024, // 10MB
  maxConcurrentOperations: 10,
};

export class ResourceExhaustionError extends Error {
  constructor(
    message: string,
    public readonly resourceType: string,
  ) {
    super(message);
    this.name = 'ResourceExhaustionError';
  }
}

export class ExecutionTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = 'ExecutionTimeoutError';
  }
}

/**
 * DoS Protection Manager
 */
export class DoSProtection {
  private limits: ResourceLimits;
  private rateLimiter: RateLimiter;
  private activeOperations = 0;
  private startTime = Date.now();

  constructor(limits: Partial<ResourceLimits> = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.rateLimiter = new RateLimiter(this.limits.maxConcurrentOperations, 10); // 10 ops per second
  }

  /**
   * Execute operation with resource limits
   */
  async executeWithLimits<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    customLimits?: Partial<ResourceLimits>,
  ): Promise<T> {
    const limits = { ...this.limits, ...customLimits };

    // Rate limiting
    if (!(await this.rateLimiter.acquire())) {
      throw new ResourceExhaustionError(
        `Rate limit exceeded for operation: ${operationName}`,
        'rate_limit',
      );
    }

    // Concurrent operations limit
    if (this.activeOperations >= limits.maxConcurrentOperations) {
      throw new ResourceExhaustionError(
        `Too many concurrent operations: ${this.activeOperations}`,
        'concurrency',
      );
    }

    this.activeOperations++;

    try {
      // Execution time limit
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new ExecutionTimeoutError(
              `Operation ${operationName} timed out after ${limits.maxExecutionTime}ms`,
              limits.maxExecutionTime,
            ),
          );
        }, limits.maxExecutionTime);
      });

      const operationPromise = Promise.resolve(operation());
      const result = await Promise.race([operationPromise, timeoutPromise]);

      // Memory usage check (if available)
      if (process.memoryUsage) {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > limits.maxMemoryUsage) {
          throw new ResourceExhaustionError(
            `Memory usage exceeded: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB > ${Math.round(limits.maxMemoryUsage / 1024 / 1024)}MB`,
            'memory',
          );
        }
      }

      return result;
    } finally {
      this.activeOperations--;
    }
  }

  /**
   * Safe JSON parsing with limits
   */
  safeJSONParse<T = any>(jsonString: string, operationName = 'JSON.parse'): T {
    // Size check
    if (jsonString.length > this.limits.maxJSONSize) {
      throw new ResourceExhaustionError(
        `JSON size exceeds limit: ${jsonString.length} > ${this.limits.maxJSONSize}`,
        'json_size',
      );
    }

    try {
      const result = JSON.parse(jsonString);

      // Depth check
      const depth = this.getObjectDepth(result);
      if (depth > this.limits.maxJSONDepth) {
        throw new ResourceExhaustionError(
          `JSON depth exceeds limit: ${depth} > ${this.limits.maxJSONDepth}`,
          'json_depth',
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ResourceExhaustionError) {
        throw error;
      }
      throw new Error(
        `Failed to parse JSON in ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Safe array operation with size limits
   */
  safeArrayOperation<T, R>(
    array: T[],
    operation: (item: T, index: number) => R,
    operationName: string,
  ): R[] {
    if (array.length > this.limits.maxArrayLength) {
      throw new ResourceExhaustionError(
        `Array length exceeds limit: ${array.length} > ${this.limits.maxArrayLength}`,
        'array_length',
      );
    }

    const results: R[] = [];
    let iterations = 0;

    for (let i = 0; i < array.length; i++) {
      if (iterations++ > this.limits.maxIterations) {
        throw new ResourceExhaustionError(
          `Iteration limit exceeded in ${operationName}: ${iterations} > ${this.limits.maxIterations}`,
          'iterations',
        );
      }

      results.push(operation(array[i], i));
    }

    return results;
  }

  /**
   * Safe string operation with length limits
   */
  safeStringOperation(input: string, _operationName: string): string {
    if (input.length > this.limits.maxStringLength) {
      throw new ResourceExhaustionError(
        `String length exceeds limit: ${input.length} > ${this.limits.maxStringLength}`,
        'string_length',
      );
    }
    return input;
  }

  /**
   * Safe regex execution with timeout protection
   */
  safeRegexExec(regex: RegExp, input: string, operationName: string): RegExpExecArray | null {
    // Check for potentially dangerous regex patterns
    const regexStr = regex.toString();
    const dangerousPatterns = [
      /\(\.\*\+/, // (.*+  - catastrophic backtracking
      /\(\.\*\?\+/, // (.*?+ - catastrophic backtracking
      /\(\.\+\)\+/, // (.+)+ - catastrophic backtracking
      /\(\.\*\)\*/, // (.*)* - catastrophic backtracking
      /\(\.\*\)\+/, // (.*)+ - catastrophic backtracking
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(regexStr)) {
        throw new ResourceExhaustionError(
          `Potentially dangerous regex pattern detected in ${operationName}: ${regexStr}`,
          'regex_dos',
        );
      }
    }

    // String length check
    this.safeStringOperation(input, operationName);

    try {
      // Use timeout for regex execution
      return this.executeWithTimeout(() => regex.exec(input), 5000); // 5 second timeout
    } catch (error) {
      throw new ResourceExhaustionError(
        `Regex execution timed out or failed in ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'regex_timeout',
      );
    }
  }

  /**
   * Safe file size validation
   */
  validateFileSize(size: number, _operationName: string): void {
    if (size > this.limits.maxFileSize) {
      throw new ResourceExhaustionError(
        `File size exceeds limit: ${Math.round(size / 1024 / 1024)}MB > ${Math.round(this.limits.maxFileSize / 1024 / 1024)}MB`,
        'file_size',
      );
    }
  }

  /**
   * Safe loop execution with iteration limits
   */
  safeLoop<T>(
    iterable: Iterable<T>,
    operation: (item: T, index: number) => void | Promise<void>,
    operationName: string,
  ): Promise<void> {
    return this.executeWithLimits(async () => {
      let iterations = 0;
      let index = 0;

      for (const item of iterable) {
        if (iterations++ > this.limits.maxIterations) {
          throw new ResourceExhaustionError(
            `Loop iteration limit exceeded in ${operationName}: ${iterations} > ${this.limits.maxIterations}`,
            'loop_iterations',
          );
        }

        await operation(item, index++);
      }
    }, operationName);
  }

  /**
   * Get system resource usage
   */
  getResourceUsage(): {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    activeOperations: number;
    cpuUsage?: NodeJS.CpuUsage;
  } {
    const usage: any = {
      memory: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
      activeOperations: this.activeOperations,
    };

    if (process.cpuUsage) {
      usage.cpuUsage = process.cpuUsage();
    }

    return usage;
  }

  /**
   * Reset DoS protection state
   */
  reset(): void {
    this.activeOperations = 0;
    this.startTime = Date.now();
  }

  // Private helper methods

  private getObjectDepth(obj: any, depth = 0): number {
    if (depth > this.limits.maxJSONDepth) {
      return depth; // Early exit to prevent stack overflow
    }

    if (obj === null || typeof obj !== 'object') {
      return depth;
    }

    if (Array.isArray(obj)) {
      return Math.max(depth, ...obj.map((item) => this.getObjectDepth(item, depth + 1)));
    }

    const values = Object.values(obj);
    if (values.length === 0) {
      return depth;
    }

    return Math.max(depth, ...values.map((value) => this.getObjectDepth(value, depth + 1)));
  }

  private executeWithTimeout<T>(operation: () => T, timeoutMs: number): T {
    const start = Date.now();

    try {
      const result = operation();

      // Check if operation took too long
      if (Date.now() - start > timeoutMs) {
        throw new ResourceExhaustionError(
          `Operation timed out after ${timeoutMs}ms`,
          'operation_timeout',
        );
      }

      return result;
    } catch (error) {
      if (Date.now() - start > timeoutMs) {
        throw new ResourceExhaustionError(
          `Operation timed out after ${timeoutMs}ms`,
          'operation_timeout',
        );
      }
      throw error;
    }
  }
}

/**
 * Global DoS protection instance
 */
export const dosProtection = new DoSProtection();

/**
 * Decorator for protecting methods against DoS
 */
export function dosProtect(operationName?: string, limits?: Partial<ResourceLimits>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return dosProtection.executeWithLimits(
        () => originalMethod.apply(this, args),
        opName,
        limits,
      );
    };

    return descriptor;
  };
}

/**
 * Safe array chunker to prevent memory exhaustion
 */
export function* safeChunker<T>(
  array: T[],
  chunkSize: number,
  maxChunks?: number,
): Generator<T[], void, unknown> {
  if (array.length > DEFAULT_LIMITS.maxArrayLength) {
    throw new ResourceExhaustionError(
      `Array too large for chunking: ${array.length} > ${DEFAULT_LIMITS.maxArrayLength}`,
      'chunk_array_size',
    );
  }

  let chunksGenerated = 0;
  const maxAllowedChunks = maxChunks || Math.ceil(DEFAULT_LIMITS.maxArrayLength / chunkSize);

  for (let i = 0; i < array.length; i += chunkSize) {
    if (chunksGenerated++ > maxAllowedChunks) {
      throw new ResourceExhaustionError(
        `Too many chunks generated: ${chunksGenerated} > ${maxAllowedChunks}`,
        'chunk_count',
      );
    }

    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Safe map operation with limits
 */
export function safeMap<T, R>(
  array: T[],
  mapper: (item: T, index: number) => R,
  operationName = 'safeMap',
): R[] {
  return dosProtection.safeArrayOperation(array, mapper, operationName);
}

/**
 * Safe filter operation with limits
 */
export function safeFilter<T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
  operationName = 'safeFilter',
): T[] {
  const results: T[] = [];

  dosProtection.safeArrayOperation(
    array,
    (item, index) => {
      if (predicate(item, index)) {
        results.push(item);
      }
      return true; // Return value not used
    },
    operationName,
  );

  return results;
}

/**
 * Safe forEach operation with limits
 */
export async function safeForEach<T>(
  array: T[],
  operation: (item: T, index: number) => void | Promise<void>,
  operationName = 'safeForEach',
): Promise<void> {
  await dosProtection.safeLoop(array, operation, operationName);
}
