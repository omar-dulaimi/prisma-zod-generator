/**
 * Standardized error handling utilities for PZG Pro
 */

export class PZGProError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly feature: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PZGProError';
  }
}

export class LicenseError extends PZGProError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'LICENSE_ERROR', 'license', context);
    this.name = 'LicenseError';
  }
}

export class ValidationError extends PZGProError {
  constructor(message: string, feature: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', feature, context);
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends PZGProError {
  constructor(message: string, feature: string, context?: Record<string, unknown>) {
    super(message, 'FILESYSTEM_ERROR', feature, context);
    this.name = 'FileSystemError';
  }
}

export class SecurityError extends PZGProError {
  constructor(message: string, feature: string, context?: Record<string, unknown>) {
    super(message, 'SECURITY_ERROR', feature, context);
    this.name = 'SecurityError';
  }
}

/**
 * Safe async wrapper that handles errors consistently
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  feature: string,
  context?: Record<string, unknown>,
): Promise<{ success: true; data: T } | { success: false; error: PZGProError }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof PZGProError) {
      return { success: false, error };
    }

    const wrappedError = new PZGProError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'UNKNOWN_ERROR',
      feature,
      { ...context, originalError: error },
    );

    return { success: false, error: wrappedError };
  }
}

/**
 * Safe sync wrapper that handles errors consistently
 */
export function safeSync<T>(
  operation: () => T,
  feature: string,
  context?: Record<string, unknown>,
): { success: true; data: T } | { success: false; error: PZGProError } {
  try {
    const result = operation();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof PZGProError) {
      return { success: false, error };
    }

    const wrappedError = new PZGProError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'UNKNOWN_ERROR',
      feature,
      { ...context, originalError: error },
    );

    return { success: false, error: wrappedError };
  }
}

/**
 * Retry wrapper for operations that may fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  feature: string = 'unknown',
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxAttempts) {
        throw new PZGProError(
          `Operation failed after ${maxAttempts} attempts: ${lastError.message}`,
          'RETRY_EXHAUSTED',
          feature,
          { maxAttempts, originalError: lastError },
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}

/**
 * Validate that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string,
  feature: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message, feature, { value });
  }
}

/**
 * Validate that a string is not empty
 */
export function assertNonEmpty(
  value: string | null | undefined,
  message: string,
  feature: string,
): asserts value is string {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(message, feature, { value });
  }
}

/**
 * Safe file operation wrapper
 */
export async function safeFileOperation<T>(
  operation: () => Promise<T> | T,
  filePath: string,
  feature: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'File operation failed';
    throw new FileSystemError(
      `Failed to perform file operation on ${filePath}: ${message}`,
      feature,
      { filePath, originalError: error },
    );
  }
}

/**
 * Production-safe logger that doesn't expose sensitive information
 */
export function logError(error: PZGProError): void {
  // Only log safe information in production
  const safeContext = {
    code: error.code,
    feature: error.feature,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  // In development, include more context
  if (process.env.NODE_ENV === 'development') {
    console.error('[PZG Pro Error]', safeContext, error.context);
  } else {
    console.error('[PZG Pro Error]', safeContext);
  }
}
