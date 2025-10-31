/**
 * Security utilities for safe file operations and input sanitization
 */

import { join, resolve, relative } from 'path';

/**
 * Sanitize a filename to prevent path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid filename provided');
  }

  // Remove any path separators and dangerous characters
  const sanitized = fileName
    .replace(/[\/\\:*?"<>|]/g, '') // Remove path separators and special chars
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/^\.+/, '') // Remove leading dots
    .trim();

  if (!sanitized) {
    throw new Error('Filename becomes empty after sanitization');
  }

  if (sanitized.length > 255) {
    throw new Error('Filename too long');
  }

  return sanitized;
}

/**
 * Safely join paths ensuring they stay within the base directory
 */
export function safeJoin(basePath: string, ...pathSegments: string[]): string {
  if (!basePath || typeof basePath !== 'string') {
    throw new Error('Invalid base path provided');
  }

  // Sanitize all path segments
  const sanitizedSegments = pathSegments
    .map((segment) => {
      if (!segment || typeof segment !== 'string') {
        throw new Error('Invalid path segment provided');
      }

      // Remove dangerous characters and path traversal attempts
      return segment
        .replace(/[\/\\:*?"<>|]/g, '_') // Replace dangerous chars with underscore
        .replace(/\.\./g, '') // Remove parent directory references
        .replace(/^\.+/, '') // Remove leading dots
        .trim();
    })
    .filter((segment) => segment.length > 0);

  if (sanitizedSegments.length === 0) {
    return basePath;
  }

  const fullPath = join(basePath, ...sanitizedSegments);
  const resolvedBasePath = resolve(basePath);
  const resolvedFullPath = resolve(fullPath);

  // Ensure the resolved path is within the base directory
  const relativePath = relative(resolvedBasePath, resolvedFullPath);
  if (relativePath.startsWith('..') || relativePath === '..') {
    throw new Error('Path traversal attempt detected');
  }

  return fullPath;
}

/**
 * Sanitize model name for safe use in code generation
 */
export function sanitizeModelName(modelName: string): string {
  if (!modelName || typeof modelName !== 'string') {
    throw new Error('Invalid model name provided');
  }

  // Ensure valid TypeScript identifier
  const sanitized = modelName
    .replace(/[^a-zA-Z0-9_$]/g, '') // Only allow valid identifier chars
    .replace(/^[0-9]/, '_$&'); // Prefix with underscore if starts with number

  if (!sanitized || sanitized.length === 0) {
    throw new Error('Model name becomes empty after sanitization');
  }

  // Check against reserved keywords
  const reservedKeywords = [
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'null',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ];

  if (reservedKeywords.includes(sanitized.toLowerCase())) {
    return `${sanitized}_Model`;
  }

  return sanitized;
}

/**
 * Sanitize field name for safe use in code generation
 */
export function sanitizeFieldName(fieldName: string): string {
  if (!fieldName || typeof fieldName !== 'string') {
    throw new Error('Invalid field name provided');
  }

  // Ensure valid property name
  const sanitized = fieldName
    .replace(/[^a-zA-Z0-9_$]/g, '') // Only allow valid property chars
    .replace(/^[0-9]/, '_$&'); // Prefix with underscore if starts with number

  if (!sanitized || sanitized.length === 0) {
    throw new Error('Field name becomes empty after sanitization');
  }

  return sanitized;
}

/**
 * Validate that a string contains only safe characters for templates
 */
export function validateTemplateInput(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid template input provided');
  }

  // Check for potential code injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /=>\s*\{/,
    /\$\{.*\}/,
    /`.*`/,
    /<!--.*-->/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      throw new Error('Potentially dangerous content detected in template input');
    }
  }

  return input;
}
