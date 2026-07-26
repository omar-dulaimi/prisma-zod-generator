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

export class FileSystemError extends PZGProError {
  constructor(message: string, feature: string, context?: Record<string, unknown>) {
    super(message, 'FILESYSTEM_ERROR', feature, context);
    this.name = 'FileSystemError';
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

  // stdout, not stderr, for the reason spelled out on `logger.warn`: Prisma runs generators as
  // child processes over JSON-RPC and does not surface their stderr. Every caller of this
  // rethrows, so the failure itself does reach the user via Prisma — but the detail here, the
  // error code and which Pro feature was refused, is the part that makes it actionable, and on
  // stderr none of it arrived.
  if (process.env.NODE_ENV === 'development') {
    console.log('[PZG Pro Error]', safeContext, error.context);
  } else {
    console.log('[PZG Pro Error]', safeContext);
  }
}

/*
 * Seven exports were removed here as unreachable: the safeAsync, safeSync and withRetry
 * wrappers, the assertDefined and assertNonEmpty guards, and the ValidationError and
 * SecurityError classes. src/license.ts is this module's only consumer, and it imports exactly
 * LicenseError, logError and safeFileOperation — 23 of the file's 24 functions were uncovered,
 * which is what prompted the look.
 *
 * ValidationError went with the two assert helpers, which were the only things that threw it.
 * FileSystemError stays because safeFileOperation throws it, and PZGProError stays as the base
 * the remaining classes extend.
 */
