/**
 * Zod Comment Parser
 *
 * Parses @zod validation annotations from Prisma schema field comments
 * to generate enhanced Zod validation schemas.
 */

import { DMMF } from '@prisma/generator-helper';
import { logger } from '../utils/logger';

/**
 * Interface for field comment context including metadata for error reporting
 */
export interface FieldCommentContext {
  modelName: string;
  fieldName: string;
  fieldType: string;
  comment: string;
  isOptional: boolean;
  isList: boolean;
}

/**
 * Interface for extracted field comments with processing status
 */
export interface ExtractedFieldComment {
  context: FieldCommentContext;
  normalizedComment: string;
  hasZodAnnotations: boolean;
  extractionErrors: string[];
}

/**
 * Interface for custom import statements
 */
export interface CustomImport {
  importStatement: string;
  source: string; // The module being imported from
  importedItems: string[]; // Names/aliases being imported
  isDefault: boolean;
  isNamespace: boolean;
  isTypeOnly: boolean; // Whether this is a type-only import (import type)
  originalStatement: string; // Original import string for debugging
}

/**
 * Interface for custom imports parsing result
 */
export interface CustomImportsParseResult {
  imports: CustomImport[];
  customSchema?: string;
  parseErrors: string[];
  isValid: boolean;
}

/**
 * Interface for model comment context including metadata for error reporting
 */
export interface ModelCommentContext {
  modelName: string;
  comment: string;
}

/**
 * Extract comments from Prisma DMMF model fields
 *
 * This function processes Prisma model field definitions and extracts
 * comment data with proper normalization and context for downstream parsing.
 *
 * @param models - Array of Prisma DMMF models
 * @returns Array of extracted field comments with context
 */
export function extractFieldComments(models: DMMF.Model[]): ExtractedFieldComment[] {
  const extractedComments: ExtractedFieldComment[] = [];

  for (const model of models) {
    for (const field of model.fields) {
      const comment = field.documentation || '';

      // Skip fields without comments
      if (!comment.trim()) {
        continue;
      }

      try {
        const context: FieldCommentContext = {
          modelName: model.name,
          fieldName: field.name,
          fieldType: field.type,
          comment: comment,
          isOptional: !field.isRequired,
          isList: field.isList,
        };

        const extractedComment = extractFieldComment(context);
        extractedComments.push(extractedComment);
      } catch (error) {
        // Add error handling for individual field processing failures
        extractedComments.push({
          context: {
            modelName: model.name,
            fieldName: field.name,
            fieldType: field.type,
            comment: comment,
            isOptional: !field.isRequired,
            isList: field.isList,
          },
          normalizedComment: '',
          hasZodAnnotations: false,
          extractionErrors: [
            `Failed to extract comment: ${error instanceof Error ? error.message : String(error)}`,
          ],
        });
      }
    }
  }

  return extractedComments;
}

/**
 * Extract and normalize a single field comment
 *
 * @param context - Field context with comment and metadata
 * @returns Extracted comment with processing information
 */
export function extractFieldComment(context: FieldCommentContext): ExtractedFieldComment {
  const errors: string[] = [];

  try {
    // Normalize whitespace and handle multi-line comments
    const normalizedComment = normalizeComment(context.comment);

    // Check if comment contains @zod annotations
    const hasZodAnnotations = detectZodAnnotations(normalizedComment);

    // Validate comment structure
    const structureErrors = validateCommentStructure(normalizedComment, context);
    errors.push(...structureErrors);

    return {
      context,
      normalizedComment,
      hasZodAnnotations,
      extractionErrors: errors,
    };
  } catch (error) {
    errors.push(
      `Comment extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    );

    return {
      context,
      normalizedComment: '',
      hasZodAnnotations: false,
      extractionErrors: errors,
    };
  }
}

/**
 * Normalize comment content for consistent processing
 *
 * Handles multi-line comments, whitespace normalization, and ensures
 * consistent format for downstream parsing.
 *
 * @param comment - Raw comment from Prisma field
 * @returns Normalized comment string
 */
export function normalizeComment(comment: string): string {
  if (!comment || typeof comment !== 'string') {
    return '';
  }

  // Handle multi-line comments by preserving @zod annotations on separate lines
  const lines = comment.split(/\r?\n/).map((line) => line.trim());

  // Remove empty lines and normalize whitespace
  const normalizedLines = lines
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/\s+/g, ' ').trim());

  return normalizedLines.join(' ');
}

/**
 * Detect if comment contains @zod validation annotations
 *
 * Performs a quick check to determine if the comment contains
 * any @zod annotations before more expensive parsing operations.
 *
 * @param comment - Normalized comment string
 * @returns True if @zod annotations are detected
 */
export function detectZodAnnotations(comment: string): boolean {
  if (!comment) {
    return false;
  }

  // Look for @zod patterns (case-insensitive) - allow optional whitespace between @zod and .
  const zodPattern = /@zod\s*\./i;
  return zodPattern.test(comment);
}

/**
 * Validate comment structure and detect potential issues
 *
 * Performs structural validation to catch common comment formatting
 * issues that could cause parsing problems later.
 *
 * @param comment - Normalized comment string
 * @param context - Field context for error reporting
 * @returns Array of validation errors
 */
export function validateCommentStructure(comment: string, context: FieldCommentContext): string[] {
  const errors: string[] = [];

  if (!comment) {
    return errors; // Empty comments are valid
  }

  // Check for unmatched parentheses in @zod annotations
  if (detectZodAnnotations(comment)) {
    const parenthesesErrors = validateParentheses(comment, context);
    errors.push(...parenthesesErrors);

    // Check for malformed @zod syntax
    const syntaxErrors = validateZodSyntax(comment, context);
    errors.push(...syntaxErrors);
  }

  return errors;
}

/**
 * Validate parentheses matching in comments
 *
 * @param comment - Comment to validate
 * @param context - Field context for error reporting
 * @returns Array of parentheses validation errors
 */
function validateParentheses(comment: string, context: FieldCommentContext): string[] {
  const errors: string[] = [];
  let parenCount = 0;

  for (let i = 0; i < comment.length; i++) {
    const char = comment[i];
    if (char === '(') {
      parenCount++;
    } else if (char === ')') {
      parenCount--;
      if (parenCount < 0) {
        errors.push(
          `${context.modelName}.${context.fieldName}: Unmatched closing parenthesis at position ${i}`,
        );
        break;
      }
    }
  }

  if (parenCount > 0) {
    errors.push(
      `${context.modelName}.${context.fieldName}: ${parenCount} unmatched opening parenthesis(es)`,
    );
  }

  return errors;
}

/**
 * Extract @zod annotations from comment with proper nested parentheses handling
 *
 * @param comment - Comment string
 * @returns Array of annotation strings
 */
function extractZodAnnotations(comment: string): string[] {
  const annotations: string[] = [];
  const zodRegex = /@zod\s*\./gi;
  let match;

  while ((match = zodRegex.exec(comment)) !== null) {
    const startIndex = match.index!;
    // Find the method name
    let currentIndex = startIndex + match[0].length;

    // Skip whitespace
    while (currentIndex < comment.length && /\s/.test(comment[currentIndex])) {
      currentIndex++;
    }

    // Extract method name
    const methodStart = currentIndex;
    while (currentIndex < comment.length && /[a-zA-Z0-9_]/.test(comment[currentIndex])) {
      currentIndex++;
    }

    if (currentIndex === methodStart) continue; // No method name found

    // Skip whitespace
    while (currentIndex < comment.length && /\s/.test(comment[currentIndex])) {
      currentIndex++;
    }

    // Check if there are parameters
    if (currentIndex < comment.length && comment[currentIndex] === '(') {
      // Find the matching closing parenthesis with proper nesting
      let depth = 0;
      let inString = false;
      let stringChar = '';

      while (currentIndex < comment.length) {
        const char = comment[currentIndex];

        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && comment[currentIndex - 1] !== '\\') {
          inString = false;
          stringChar = '';
        } else if (!inString) {
          if (char === '(') {
            depth++;
          } else if (char === ')') {
            depth--;
            if (depth === 0) {
              currentIndex++; // Include the closing parenthesis
              break;
            }
          }
        }
        currentIndex++;
      }

      if (depth === 0) {
        annotations.push(comment.substring(startIndex, currentIndex));
      }
    } else {
      // No parameters, just method name
      annotations.push(comment.substring(startIndex, currentIndex));
    }
  }

  return annotations;
}

/**
 * Parse @zod annotations with proper nested parentheses support
 *
 * @param comment - Comment string
 * @param context - Field context
 * @returns Parse result with annotations and errors
 */
function parseZodAnnotationsWithNestedParentheses(
  comment: string,
  context: FieldCommentContext,
): ZodAnnotationParseResult {
  const result: ZodAnnotationParseResult = {
    annotations: [],
    parseErrors: [],
    isValid: true,
  };

  const annotationStrings = extractZodAnnotations(comment);

  for (const annotationStr of annotationStrings) {
    try {
      const methodMatch = annotationStr.match(/@zod\s*\.([a-zA-Z_][a-zA-Z0-9_]*)/i);
      if (!methodMatch) continue;

      const methodName = methodMatch[1];
      const paramStart = annotationStr.indexOf('(');

      if (paramStart !== -1) {
        const paramEnd = annotationStr.lastIndexOf(')');
        if (paramEnd !== -1) {
          const parameterString = annotationStr.substring(paramStart, paramEnd + 1);
          const fakeMatch = [
            annotationStr,
            methodName,
            parameterString,
          ] as unknown as RegExpExecArray;
          fakeMatch.index = 0;

          const annotation = parseZodAnnotation(fakeMatch, context);
          result.annotations.push(annotation);
        }
      } else {
        const fakeMatch = [annotationStr, methodName, ''] as unknown as RegExpExecArray;
        fakeMatch.index = 0;

        const annotation = parseZodAnnotation(fakeMatch, context);
        result.annotations.push(annotation);
      }
    } catch (error) {
      const errorMessage = `Failed to parse @zod annotation "${annotationStr}": ${
        error instanceof Error ? error.message : String(error)
      }`;
      result.parseErrors.push(errorMessage);
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Validate basic @zod annotation syntax
 *
 * @param comment - Comment to validate
 * @param context - Field context for error reporting
 * @returns Array of syntax validation errors
 */
function validateZodSyntax(comment: string, context: FieldCommentContext): string[] {
  const errors: string[] = [];

  // Look for @zod annotations and validate basic structure - allow optional whitespace
  const zodMatches = extractZodAnnotations(comment);

  if (zodMatches) {
    zodMatches.forEach((match, _index) => {
      // Check for common syntax issues
      if (match.includes('..')) {
        errors.push(
          `${context.modelName}.${context.fieldName}: Invalid double dots in @zod annotation: ${match}`,
        );
      }

      if (match.includes('@zod.()')) {
        errors.push(
          `${context.modelName}.${context.fieldName}: Empty method name in @zod annotation: ${match}`,
        );
      }
    });
  }

  return errors;
}

/**
 * Get comment extraction statistics for debugging
 *
 * @param extractedComments - Array of extracted comments
 * @returns Statistics about comment extraction
 */
export function getExtractionStatistics(extractedComments: ExtractedFieldComment[]): {
  totalFields: number;
  fieldsWithComments: number;
  fieldsWithZodAnnotations: number;
  extractionErrors: number;
} {
  const totalFields = extractedComments.length;
  const fieldsWithComments = extractedComments.filter(
    (ec) => ec.normalizedComment.length > 0,
  ).length;
  const fieldsWithZodAnnotations = extractedComments.filter((ec) => ec.hasZodAnnotations).length;
  const extractionErrors = extractedComments.filter((ec) => ec.extractionErrors.length > 0).length;

  return {
    totalFields,
    fieldsWithComments,
    fieldsWithZodAnnotations,
    extractionErrors,
  };
}

/**
 * Filter extracted comments to only those with @zod annotations
 *
 * @param extractedComments - Array of all extracted comments
 * @returns Array of comments containing @zod annotations
 */
export function filterZodComments(
  extractedComments: ExtractedFieldComment[],
): ExtractedFieldComment[] {
  return extractedComments.filter((ec) => ec.hasZodAnnotations && ec.extractionErrors.length === 0);
}

/**
 * Get all extraction errors across multiple field comments
 *
 * @param extractedComments - Array of extracted comments
 * @returns Array of all errors with field context
 */
export function getAllExtractionErrors(extractedComments: ExtractedFieldComment[]): Array<{
  modelName: string;
  fieldName: string;
  errors: string[];
}> {
  return extractedComments
    .filter((ec) => ec.extractionErrors.length > 0)
    .map((ec) => ({
      modelName: ec.context.modelName,
      fieldName: ec.context.fieldName,
      errors: ec.extractionErrors,
    }));
}

/**
 * Interface for parsed @zod annotation
 */
export interface ParsedZodAnnotation {
  method: string;
  parameters: unknown[];
  rawMatch: string;
  position: number;
}

/**
 * Interface for @zod annotation parsing result
 */
export interface ZodAnnotationParseResult {
  annotations: ParsedZodAnnotation[];
  parseErrors: string[];
  isValid: boolean;
}

/**
 * Parse @zod annotations from normalized comment text
 *
 * Extracts and parses all @zod annotations including method names,
 * parameters, and handles complex chaining scenarios.
 *
 * @param comment - Normalized comment string
 * @param context - Field context for error reporting
 * @returns Parse result with annotations and errors
 */
export function parseZodAnnotations(
  comment: string,
  context: FieldCommentContext,
): ZodAnnotationParseResult {
  const result: ZodAnnotationParseResult = {
    annotations: [],
    parseErrors: [],
    isValid: true,
  };

  if (!comment || !detectZodAnnotations(comment)) {
    return result;
  }

  try {
    // Check if we have multiple method calls (chained) by counting dots after @zod
    const methodCount = (comment.match(/\.([a-zA-Z_][a-zA-Z0-9_]*)/g) || []).length;
    const hasChainedAnnotations = methodCount > 1;

    if (hasChainedAnnotations) {
      // Handle chained @zod annotations (e.g., @zod.min(1).max(100))
      const chainedAnnotations = parseChainedZodAnnotations(comment, context);
      result.annotations.push(...chainedAnnotations.annotations);
      result.parseErrors.push(...chainedAnnotations.parseErrors);

      if (chainedAnnotations.parseErrors.length > 0) {
        result.isValid = false;
      }
    } else {
      // Handle simple @zod annotations with proper nested parentheses support
      const annotations = parseZodAnnotationsWithNestedParentheses(comment, context);
      result.annotations.push(...annotations.annotations);
      result.parseErrors.push(...annotations.parseErrors);
      if (annotations.parseErrors.length > 0) {
        result.isValid = false;
      }
    }

    // Validate and filter the parsed annotations
    if (result.annotations.length > 0) {
      const validAnnotations: ParsedZodAnnotation[] = [];
      const validationErrors: string[] = [];

      for (const annotation of result.annotations) {
        try {
          validateZodMethod(annotation, context);
          validAnnotations.push(annotation);
        } catch (error) {
          validationErrors.push(
            `${context.modelName}.${context.fieldName}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue processing other annotations instead of failing completely
        }
      }

      // Only fail if no annotations are valid
      if (validAnnotations.length === 0 && validationErrors.length > 0) {
        result.parseErrors.push(...validationErrors);
        result.isValid = false;
      } else {
        result.annotations = validAnnotations;
        // Log validation errors but don't fail if we have some valid annotations
        if (validationErrors.length > 0) {
          logger.warn('Some @zod annotations were invalid and filtered out:', validationErrors);
        }
      }
    }
  } catch (error) {
    result.parseErrors.push(
      `General parsing error: ${error instanceof Error ? error.message : String(error)}`,
    );
    result.isValid = false;
  }

  return result;
}

/**
 * Parse a single @zod annotation match
 *
 * @param match - Regex match result
 * @param context - Field context for error reporting
 * @returns Parsed annotation object
 */
function parseZodAnnotation(
  match: RegExpExecArray,
  context: FieldCommentContext,
): ParsedZodAnnotation {
  const [fullMatch, methodName, parameterString] = match;
  const position = match.index || 0;

  // Parse parameters if present
  let parameters: unknown[] = [];
  if (parameterString && parameterString.trim() !== '()') {
    try {
      parameters = parseZodParameters(parameterString, context, methodName);
    } catch (error) {
      throw new Error(
        `Invalid parameters in ${methodName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    method: methodName,
    parameters,
    rawMatch: fullMatch,
    position,
  };
}

/**
 * Parse chained @zod annotations like @zod.min(1).max(100)
 *
 * @param comment - Comment string
 * @param context - Field context
 * @returns Parse result for chained annotations
 */
function parseChainedZodAnnotations(
  comment: string,
  context: FieldCommentContext,
): ZodAnnotationParseResult {
  const result: ZodAnnotationParseResult = {
    annotations: [],
    parseErrors: [],
    isValid: true,
  };

  try {
    // Find the @zod annotation start
    const zodIndex = comment.indexOf('@zod');
    if (zodIndex === -1) {
      return result;
    }

    // Extract the entire @zod chain starting from @zod
    const zodChain = comment.slice(zodIndex);

    // Use the improved parseMethodChain function to handle the entire chain
    const chainedMethods = parseMethodChain(zodChain, context);
    result.annotations.push(...chainedMethods);
  } catch (error) {
    result.parseErrors.push(
      `Failed to parse chained annotation: ${error instanceof Error ? error.message : String(error)}`,
    );
    result.isValid = false;
  }

  return result;
}

/**
 * Parse a method chain like .min(1).max(100)
 *
 * @param chainString - The chained method string
 * @param context - Field context
 * @returns Array of parsed annotations
 */
function parseMethodChain(
  chainString: string,
  context: FieldCommentContext,
): ParsedZodAnnotation[] {
  const annotations: ParsedZodAnnotation[] = [];

  // Parse method calls manually to handle nested parentheses properly
  let i = 0;
  while (i < chainString.length) {
    // Find next method call starting with a dot
    const dotIndex = chainString.indexOf('.', i);
    if (dotIndex === -1) break;

    // Extract method name
    const methodStart = dotIndex + 1;
    let methodEnd = methodStart;
    while (methodEnd < chainString.length && /[a-zA-Z0-9_]/.test(chainString[methodEnd])) {
      methodEnd++;
    }

    if (methodEnd === methodStart) {
      i = dotIndex + 1;
      continue;
    }

    const methodName = chainString.slice(methodStart, methodEnd);

    // Skip whitespace
    while (methodEnd < chainString.length && /\s/.test(chainString[methodEnd])) {
      methodEnd++;
    }

    // Check for parameter list
    let parameterString = '';
    if (methodEnd < chainString.length && chainString[methodEnd] === '(') {
      // Find matching closing parenthesis, handling nested parentheses
      let parenCount = 1;
      const paramStart = methodEnd + 1;
      let paramEnd = paramStart;

      while (paramEnd < chainString.length && parenCount > 0) {
        const char = chainString[paramEnd];
        if (char === '(') {
          parenCount++;
        } else if (char === ')') {
          parenCount--;
        }
        paramEnd++;
      }

      if (parenCount === 0) {
        parameterString = chainString.slice(methodEnd, paramEnd);
        i = paramEnd;
      } else {
        throw new Error(`Unmatched parentheses in method ${methodName}`);
      }
    } else {
      // No parameters
      parameterString = '()';
      i = methodEnd;
    }

    // Parse parameters
    let parameters: unknown[] = [];
    if (parameterString && parameterString.trim() !== '()') {
      try {
        parameters = parseZodParameters(parameterString, context, methodName);
      } catch (error) {
        throw new Error(
          `Invalid parameters in chained method ${methodName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    annotations.push({
      method: methodName,
      parameters,
      rawMatch: `.${methodName}${parameterString}`,
      position: dotIndex,
    });
  }

  return annotations;
}

/**
 * Parse parameter string from @zod annotation
 *
 * Handles various parameter types: numbers, strings, booleans, arrays, objects
 *
 * @param parameterString - Parameter string including parentheses
 * @param context - Field context for error reporting
 * @param methodName - Method name for error context
 * @returns Array of parsed parameters
 */
function parseZodParameters(
  parameterString: string,
  context: FieldCommentContext,
  methodName: string,
): unknown[] {
  // Remove outer parentheses
  const innerParams = parameterString.slice(1, -1).trim();

  if (!innerParams) {
    return [];
  }

  try {
    // Handle simple cases first
    if (isSimpleParameter(innerParams)) {
      return [parseSimpleParameter(innerParams)];
    }

    // Handle multiple parameters - split by commas not inside quotes or nested structures
    const paramParts = splitParameters(innerParams);
    return paramParts.map((part) => parseSimpleParameter(part.trim()));
  } catch (error) {
    throw new Error(
      `Failed to parse parameters "${innerParams}" for ${methodName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Check if parameter string is a simple single parameter
 *
 * @param paramString - Parameter string
 * @returns True if simple parameter
 */
function isSimpleParameter(paramString: string): boolean {
  const trimmed = paramString.trim();

  // Check if it contains unquoted commas (indicating multiple parameters)
  let inQuotes = false;
  let quoteChar = '';
  let bracketDepth = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar && trimmed[i - 1] !== '\\') {
      inQuotes = false;
      quoteChar = '';
    } else if (!inQuotes) {
      if (char === '[' || char === '{' || char === '(') {
        bracketDepth++;
      } else if (char === ']' || char === '}' || char === ')') {
        bracketDepth--;
      } else if (char === ',' && bracketDepth === 0) {
        return false; // Multiple parameters
      }
    }
  }

  return true;
}

/**
 * Split parameter string by commas, respecting quotes and nested structures
 *
 * @param paramString - Parameter string
 * @returns Array of parameter parts
 */
function splitParameters(paramString: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let bracketDepth = 0;

  for (let i = 0; i < paramString.length; i++) {
    const char = paramString[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar && paramString[i - 1] !== '\\') {
      inQuotes = false;
      quoteChar = '';
      current += char;
    } else if (!inQuotes) {
      if (char === '[' || char === '{' || char === '(') {
        bracketDepth++;
        current += char;
      } else if (char === ']' || char === '}' || char === ')') {
        bracketDepth--;
        current += char;
      } else if (char === ',' && bracketDepth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Parse a single parameter value
 *
 * @param paramValue - Parameter string value
 * @returns Parsed parameter value
 */
function parseSimpleParameter(paramValue: string): unknown {
  const trimmed = paramValue.trim();

  if (!trimmed) {
    throw new Error('Empty parameter value');
  }

  // Boolean values
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Null and undefined
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;

  // Numbers (integers and floats)
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^-?\d*\.\d+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Quoted strings
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Regular expressions
  if (trimmed.startsWith('/') && trimmed.match(/\/[gimuy]*$/)) {
    try {
      const lastSlash = trimmed.lastIndexOf('/');
      const pattern = trimmed.slice(1, lastSlash);
      const flags = trimmed.slice(lastSlash + 1);
      return new RegExp(pattern, flags);
    } catch {
      throw new Error(`Invalid regex: ${trimmed}`);
    }
  }

  // Arrays (basic support)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`Invalid array: ${trimmed}`);
    }
  }

  // Objects (JavaScript object literal support)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      // First try standard JSON parsing for simple cases
      return JSON.parse(trimmed);
    } catch {
      // For complex JavaScript object literals, return as-is as a special marker
      // This will be handled specially in formatParameters to preserve JavaScript expressions
      return { __js_object_literal__: trimmed };
    }
  }

  // Complex expressions (like new Date(), function calls, etc.)
  if (trimmed.includes('(') && trimmed.includes(')')) {
    // Pass through complex expressions as-is for evaluation at runtime
    return trimmed;
  }

  // Unquoted strings (identifiers, etc.)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }

  // If we can't parse it, pass it through as a raw string
  // This allows complex expressions to be used in the generated code
  return trimmed;
}

/**
 * Validate parsed @zod annotations for semantic correctness
 *
 * @param annotations - Array of parsed annotations
 * @param context - Field context
 * @returns Array of validation errors
 */
export function validateZodAnnotations(
  annotations: ParsedZodAnnotation[],
  context: FieldCommentContext,
): string[] {
  const errors: string[] = [];

  for (const annotation of annotations) {
    try {
      validateZodMethod(annotation, context);
    } catch (error) {
      errors.push(
        `${context.modelName}.${context.fieldName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return errors;
}

/**
 * Validate a single @zod method annotation
 *
 * @param annotation - Parsed annotation
 * @param context - Field context
 */
function validateZodMethod(annotation: ParsedZodAnnotation, context: FieldCommentContext): void {
  const { method, parameters } = annotation;

  // Common string validation methods
  const stringMethods = [
    'min',
    'max',
    'length',
    'email',
    'url',
    'uuid',
    'regex',
    'includes',
    'startsWith',
    'endsWith',
    'trim',
    'toLowerCase',
    'toUpperCase',
    'datetime',
    // New Zod v4 string format methods - Issue #233
    'httpUrl',
    'hostname',
    'nanoid',
    'cuid',
    'cuid2',
    'ulid',
    'base64',
    'base64url',
    'hex',
    'jwt',
    'hash',
    'ipv4',
    'ipv6',
    'cidrv4',
    'cidrv6',
    'emoji',
  ];

  // Common number validation methods
  const numberMethods = [
    'min',
    'max',
    'int',
    'positive',
    'negative',
    'nonnegative',
    'nonpositive',
    'finite',
    'multipleOf',
    'step',
  ];

  // Common array validation methods
  const arrayMethods = ['min', 'max', 'length', 'nonempty'];

  // Methods that require parameters
  const requiresParams = [
    'min',
    'max',
    'length',
    'regex',
    'includes',
    'startsWith',
    'endsWith',
    'enum',
    'default',
    'refine',
    'transform',
    'multipleOf',
    'step',
    // New methods that require parameters - Issue #233
    'hash', // hash requires algorithm parameter like "sha256"
    'custom', // custom requires object/array schema parameter
  ];

  // Methods that don't allow parameters
  const noParams = ['nonempty', 'trim', 'toLowerCase', 'toUpperCase'];

  // Methods that accept optional parameters (format validation methods)
  const optionalParams = [
    // Existing string format methods
    'email',
    'url',
    'uuid',
    'datetime',
    // New Zod v4 string format methods - Issue #233
    'httpUrl',
    'hostname',
    'nanoid',
    'cuid',
    'cuid2',
    'ulid',
    'base64',
    'base64url',
    'hex',
    'jwt',
    'ipv4',
    'ipv6',
    'cidrv4',
    'cidrv6',
    'emoji',
  ];

  // Methods that accept optional error message parameter
  const optionalErrorMessage = [
    'int',
    'positive',
    'negative',
    'nonnegative',
    'nonpositive',
    'finite',
  ];

  // Additional known methods not covered above
  const additionalMethods = [
    'default',
    'optional',
    'nullable',
    'nullish',
    'refine',
    'transform',
    'enum',
    'object',
    'array',
    'record',
    'json',
  ];

  // Check if method is known
  const allKnownMethods = [
    ...new Set([
      ...stringMethods,
      ...numberMethods,
      ...arrayMethods,
      ...additionalMethods,
      ...optionalErrorMessage,
      ...optionalParams,
      ...requiresParams, // Add methods that require parameters
    ]),
  ];
  if (!allKnownMethods.includes(method)) {
    throw new Error(`Unknown @zod method: ${method} - this method is not supported`);
  }

  // Validate parameter requirements
  if (requiresParams.includes(method) && parameters.length === 0) {
    throw new Error(`Method ${method} requires parameters`);
  }

  if (noParams.includes(method) && parameters.length > 0) {
    throw new Error(`Method ${method} does not accept parameters`);
  }

  // Validate optional parameter methods (string format methods)
  if (optionalParams.includes(method) && parameters.length > 1) {
    throw new Error(`Method ${method} accepts at most one parameter`);
  }

  // Validate optional error message methods
  if (optionalErrorMessage.includes(method) && parameters.length > 1) {
    throw new Error(`Method ${method} accepts at most one parameter (error message)`);
  }

  if (
    optionalErrorMessage.includes(method) &&
    parameters.length === 1 &&
    typeof parameters[0] !== 'string'
  ) {
    throw new Error(`Method ${method} error message parameter must be a string`);
  }

  // Type-specific validations based on field type
  if (context.fieldType === 'String') {
    validateStringMethodParameters(method, parameters);
  } else if (context.fieldType === 'Int' || context.fieldType === 'Float') {
    validateNumberMethodParameters(method, parameters);
  }
}

/**
 * Validate parameters for string validation methods
 *
 * @param method - Validation method name
 * @param parameters - Method parameters
 */
function validateStringMethodParameters(method: string, parameters: unknown[]): void {
  switch (method) {
    case 'min':
    case 'max':
    case 'length':
      // Allow 1 parameter (number) or 2 parameters (number + error message)
      if (
        parameters.length < 1 ||
        parameters.length > 2 ||
        typeof parameters[0] !== 'number' ||
        parameters[0] < 0 ||
        (parameters.length === 2 && typeof parameters[1] !== 'string')
      ) {
        throw new Error(
          `${method} requires a non-negative number parameter and optional error message`,
        );
      }
      break;

    case 'regex':
      if (parameters.length < 1 || parameters.length > 2) {
        throw new Error(`regex requires 1-2 parameters (RegExp/string, optional error message)`);
      }
      if (!(parameters[0] instanceof RegExp || typeof parameters[0] === 'string')) {
        throw new Error(`regex first parameter must be a RegExp or string`);
      }
      if (parameters.length === 2 && typeof parameters[1] !== 'string') {
        throw new Error(`regex second parameter (error message) must be a string`);
      }
      break;

    case 'includes':
    case 'startsWith':
    case 'endsWith':
      if (parameters.length !== 1 || typeof parameters[0] !== 'string') {
        throw new Error(`${method} requires a string parameter`);
      }
      break;

    case 'hash':
      if (parameters.length !== 1 || typeof parameters[0] !== 'string') {
        throw new Error(`hash requires a single string algorithm parameter (e.g., 'sha256')`);
      }
      break;
  }
}

/**
 * Validate parameters for number validation methods
 *
 * @param method - Validation method name
 * @param parameters - Method parameters
 */
function validateNumberMethodParameters(method: string, parameters: unknown[]): void {
  switch (method) {
    case 'min':
    case 'max':
      // Allow 1 parameter (number) or 2 parameters (number + error message)
      if (
        parameters.length < 1 ||
        parameters.length > 2 ||
        typeof parameters[0] !== 'number' ||
        (parameters.length === 2 && typeof parameters[1] !== 'string')
      ) {
        throw new Error(`${method} requires a number parameter and optional error message`);
      }
      break;

    case 'positive':
    case 'negative':
    case 'int':
    case 'finite':
      // Allow 0 parameters or 1 parameter (error message)
      if (parameters.length > 1 || (parameters.length === 1 && typeof parameters[0] !== 'string')) {
        throw new Error(`${method} accepts optional error message parameter`);
      }
      break;

    case 'multipleOf':
    case 'step':
      // Allow 1 parameter (number) or 2 parameters (number + error message)
      if (
        parameters.length < 1 ||
        parameters.length > 2 ||
        typeof parameters[0] !== 'number' ||
        (parameters.length === 2 && typeof parameters[1] !== 'string')
      ) {
        throw new Error(`${method} requires a number parameter and optional error message`);
      }
      break;
  }
}

/**
 * Interface for Zod schema generation result
 */
export interface ZodSchemaGenerationResult {
  schemaChain: string;
  imports: Set<string>;
  errors: string[];
  isValid: boolean;
}

/**
 * Interface for validation method mapping configuration
 */
export interface ValidationMethodConfig {
  methodName: string;
  zodMethod: string;
  parameterCount: number | 'variable';
  requiresImport?: string;
  fieldTypeCompatibility?: string[];
}

/**
 * Map parsed @zod annotations to Zod schema method calls
 *
 * Converts parsed annotations into actual Zod validation method chains
 * that can be used in generated schema code.
 *
 * @param annotations - Array of parsed annotations
 * @param context - Field context for validation
 * @param zodVersion - Zod version target ('v3', 'v4', or 'auto')
 * @returns Schema generation result with method chain and imports
 */
export function mapAnnotationsToZodSchema(
  annotations: ParsedZodAnnotation[],
  context: FieldCommentContext,
  zodVersion: 'auto' | 'v3' | 'v4' = 'auto',
): ZodSchemaGenerationResult {
  const result: ZodSchemaGenerationResult = {
    schemaChain: '',
    imports: new Set<string>(),
    errors: [],
    isValid: true,
  };

  if (annotations.length === 0) {
    return result;
  }

  try {
    const methodCalls: string[] = [];
    const methodResults: MethodMappingResult[] = [];

    for (const annotation of annotations) {
      try {
        const methodResult = mapAnnotationToZodMethod(annotation, context, zodVersion);
        // Skip empty fallbacks (e.g., v3 for v4-only base methods)
        if (methodResult.methodCall) {
          methodCalls.push(methodResult.methodCall);
        }
        methodResults.push(methodResult);

        // Add any required imports
        if (methodResult.requiredImport) {
          result.imports.add(methodResult.requiredImport);
        }
      } catch (error) {
        result.errors.push(
          `Failed to map ${annotation.method}: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.isValid = false;
      }
    }

    // Join all method calls into a chain
    if (methodCalls.length > 0) {
      // Check if we have a base replacement method (like z.email() in v4)
      const baseReplacements = methodResults.filter((result) => result.isBaseReplacement);
      const regularReplacements = methodCalls.filter(
        (call) =>
          call &&
          !call.startsWith('.') &&
          !methodResults.find((r) => r.methodCall === call)?.isBaseReplacement,
      );
      const chainMethods = methodCalls.filter((call) => call.startsWith('.'));

      if (baseReplacements.length > 0) {
        // Handle base replacement (like z.email() in v4) with chaining
        if (baseReplacements.length > 1) {
          result.errors.push(
            'Multiple base replacement methods detected - only one allowed per field',
          );
          result.isValid = false;
        } else {
          result.schemaChain = baseReplacements[0].methodCall + chainMethods.join('');
        }
      } else if (regularReplacements.length > 0) {
        // Handle regular replacement methods (json, enum)
        const chainMethods = methodCalls.filter((call) => call.startsWith('.'));

        if (regularReplacements.length > 1) {
          result.errors.push('Multiple replacement methods detected - only one allowed per field');
          result.isValid = false;
        } else {
          // Use the replacement method as base, then chain any additional methods
          result.schemaChain = regularReplacements[0] + chainMethods.join('');
        }
      } else {
        // All are chaining methods, join normally
        result.schemaChain = methodCalls.join('');
      }
    }
  } catch (error) {
    result.errors.push(
      `Schema generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    result.isValid = false;
  }

  return result;
}

/**
 * Interface for single method mapping result
 */
interface MethodMappingResult {
  methodCall: string;
  requiredImport?: string;
  isBaseReplacement?: boolean;
}

/**
 * Resolve the target Zod version for syntax generation
 *
 * @param zodVersion - Version specification ('auto', 'v3', or 'v4')
 * @returns Resolved version ('v3' or 'v4')
 */
function resolveZodVersion(zodVersion: 'auto' | 'v3' | 'v4'): 'v3' | 'v4' {
  if (zodVersion === 'v3' || zodVersion === 'v4') {
    return zodVersion;
  }

  // Auto-detect Zod version
  try {
    // Try to detect Zod version by loading zod package.json
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const zodPackage = require('zod/package.json');
    const version = zodPackage.version;

    if (version) {
      const majorVersion = parseInt(version.split('.')[0], 10);
      return majorVersion >= 4 ? 'v4' : 'v3';
    }
  } catch {
    // If we can't load zod package.json, try alternative detection
    try {
      // Try to detect by checking if z.email() method exists as standalone
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const zod = require('zod');
      if (typeof zod.z?.email === 'function') {
        return 'v4';
      }
    } catch {
      // Ignore inner detection errors
    }
  }

  // Fallback to v3 if detection fails
  logger.warn('Failed to detect Zod version, defaulting to v3 syntax');
  return 'v3';
}

/**
 * Map a single annotation to a Zod method call
 *
 * @param annotation - Parsed annotation
 * @param context - Field context
 * @param zodVersion - Zod version target for version-specific handling
 * @returns Method mapping result
 */
function mapAnnotationToZodMethod(
  annotation: ParsedZodAnnotation,
  context: FieldCommentContext,
  zodVersion: 'auto' | 'v3' | 'v4' = 'auto',
): MethodMappingResult {
  const { method, parameters } = annotation;

  // Get method configuration
  const methodConfig = getValidationMethodConfig(method, context.fieldType);

  if (!methodConfig) {
    // Unknown method - pass through as-is with warning
    logger.warn(`Unknown @zod method: ${method} - generating as-is`);
    return {
      methodCall: `.${method}(${formatParameters(parameters)})`,
    };
  }

  // Validate field type compatibility
  if (
    methodConfig.fieldTypeCompatibility &&
    !methodConfig.fieldTypeCompatibility.includes(context.fieldType)
  ) {
    throw new Error(
      `Method ${method} is not compatible with field type ${context.fieldType}. Compatible types: ${methodConfig.fieldTypeCompatibility.join(', ')}`,
    );
  }

  // Validate parameter count
  if (methodConfig.parameterCount !== 'variable') {
    if (parameters.length !== methodConfig.parameterCount) {
      throw new Error(
        `Method ${method} expects ${methodConfig.parameterCount} parameters, got ${parameters.length}`,
      );
    }
  }

  // Handle special cases that replace the base type rather than chain
  if (method === 'json') {
    // z.json() replaces the base type entirely
    return {
      methodCall: 'z.json()',
      requiredImport: methodConfig.requiresImport,
    };
  }

  if (method === 'enum') {
    // z.enum() replaces the base type entirely
    const formattedParams = formatParameters(parameters);
    return {
      methodCall: `z.enum(${formattedParams})`,
      requiredImport: methodConfig.requiresImport,
    };
  }

  if (method === 'custom') {
    if (parameters.length === 0) {
      throw new Error('Method custom requires parameters');
    }

    const [schemaCandidate] = parameters;

    if (
      schemaCandidate &&
      typeof schemaCandidate === 'object' &&
      !('__js_object_literal__' in (schemaCandidate as Record<string, unknown>))
    ) {
      const zodSchema = inferZodTypeFromValue(schemaCandidate);
      return {
        methodCall: zodSchema,
        requiredImport: methodConfig.requiresImport,
        isBaseReplacement: true,
      };
    }

    if (typeof schemaCandidate === 'string') {
      try {
        const zodSchema = inferZodTypeFromValue(JSON.parse(schemaCandidate));
        return {
          methodCall: zodSchema,
          requiredImport: methodConfig.requiresImport,
          isBaseReplacement: true,
        };
      } catch {
        // Fall through; formatParameters will handle non-JSON literals.
      }
    }

    const formattedParams = formatParameters(parameters);
    return {
      methodCall: `z.object(${formattedParams})`,
      requiredImport: methodConfig.requiresImport,
      isBaseReplacement: true,
    };
  }

  // Handle new Zod v4 string format methods - Issue #233
  const newStringFormatMethods = [
    'email',
    'url',
    'uuid',
    'httpUrl',
    'hostname',
    'nanoid',
    'cuid',
    'cuid2',
    'ulid',
    'base64',
    'base64url',
    'hex',
    'jwt',
    'ipv4',
    'ipv6',
    'cidrv4',
    'cidrv6',
    'emoji',
    // Note: 'regex' is not included because z.regex() is not a valid method
    // regex should use z.string().regex() syntax instead
    'isoDate',
    'isoTime',
    'isoDatetime',
    'isoDuration',
  ];

  if (newStringFormatMethods.includes(method)) {
    const resolvedVersion = resolveZodVersion(zodVersion);

    if (resolvedVersion === 'v4') {
      // In Zod v4, prefer base types like z.httpUrl(), z.base64(), etc.
      // Don't chain unnecessarily!
      const formattedParams = formatV4StringFormatParameters(method, parameters);

      // Special handling for ISO methods which use z.iso.xxx() syntax
      const isoMethods = ['isoDate', 'isoTime', 'isoDatetime', 'isoDuration'];
      let methodCall: string;
      if (isoMethods.includes(method)) {
        const isoMethodMap: Record<string, string> = {
          isoDate: 'z.iso.date',
          isoTime: 'z.iso.time',
          isoDatetime: 'z.iso.datetime',
          isoDuration: 'z.iso.duration',
        };
        methodCall = formattedParams
          ? `${isoMethodMap[method]}(${formattedParams})`
          : `${isoMethodMap[method]}()`;
      } else {
        methodCall = formattedParams ? `z.${method}(${formattedParams})` : `z.${method}()`;
      }

      return {
        methodCall,
        requiredImport: methodConfig.requiresImport,
        isBaseReplacement: true,
      };
    }
    // For v3, fallback to z.string() since these methods likely don't exist
    logger.warn(
      `[zod-comments] Method ${method} not supported in Zod v3; falling back to z.string()`,
    );
    return {
      methodCall: '', // Will result in base z.string() only
      requiredImport: methodConfig.requiresImport,
    };
  }

  // Handle hash method with parameter (special case)
  if (method === 'hash') {
    const resolvedVersion = resolveZodVersion(zodVersion);

    if (resolvedVersion === 'v4') {
      // In Zod v4, z.hash(algorithm) is a base type
      const formattedParams = formatParameters(parameters);
      return {
        methodCall: `z.hash(${formattedParams})`,
        requiredImport: methodConfig.requiresImport,
        isBaseReplacement: true,
      };
    }
    // For v3, fallback to z.string() since hash() likely doesn't exist
    logger.warn(`[zod-comments] Method hash not supported in Zod v3; falling back to z.string()`);
    return {
      methodCall: '', // Will result in base z.string() only
      requiredImport: methodConfig.requiresImport,
    };
  }

  // Generate the method call for regular chaining methods
  const formattedParams = formatParameters(parameters);
  const methodCall = `.${methodConfig.zodMethod}(${formattedParams})`;

  return {
    methodCall,
    requiredImport: methodConfig.requiresImport,
  };
}

/**
 * Get validation method configuration
 *
 * @param methodName - Name of the validation method
 * @param fieldType - Field type for compatibility checking
 * @returns Method configuration or null if unknown
 */
function getValidationMethodConfig(
  methodName: string,
  fieldType?: string,
): ValidationMethodConfig | null {
  const configs: ValidationMethodConfig[] = [
    // String validation methods
    {
      methodName: 'min',
      zodMethod: 'min',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'max',
      zodMethod: 'max',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'length',
      zodMethod: 'length',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'email',
      zodMethod: 'email',
      parameterCount: 'variable', // 0 or 1 parameter
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'url',
      zodMethod: 'url',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'uuid',
      zodMethod: 'uuid',
      parameterCount: 'variable', // 0 or 1 parameter
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'regex',
      zodMethod: 'regex',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'includes',
      zodMethod: 'includes',
      parameterCount: 1,
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'startsWith',
      zodMethod: 'startsWith',
      parameterCount: 1,
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'endsWith',
      zodMethod: 'endsWith',
      parameterCount: 1,
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'trim',
      zodMethod: 'trim',
      parameterCount: 0,
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'toLowerCase',
      zodMethod: 'toLowerCase',
      parameterCount: 0,
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'toUpperCase',
      zodMethod: 'toUpperCase',
      parameterCount: 0,
      fieldTypeCompatibility: ['String'],
    },

    // Number validation methods
    {
      methodName: 'min',
      zodMethod: 'min',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['Int', 'Float', 'BigInt'],
    },
    {
      methodName: 'max',
      zodMethod: 'max',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['Int', 'Float', 'BigInt'],
    },
    {
      methodName: 'int',
      zodMethod: 'int',
      parameterCount: 0,
      fieldTypeCompatibility: ['Int', 'Float'],
    },
    {
      methodName: 'positive',
      zodMethod: 'positive',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['Int', 'Float', 'BigInt'],
    },
    {
      methodName: 'negative',
      zodMethod: 'negative',
      parameterCount: 0,
      fieldTypeCompatibility: ['Int', 'Float', 'BigInt'],
    },
    {
      methodName: 'nonnegative',
      zodMethod: 'nonnegative',
      parameterCount: 0,
      fieldTypeCompatibility: ['Int', 'Float', 'BigInt'],
    },
    {
      methodName: 'nonpositive',
      zodMethod: 'nonpositive',
      parameterCount: 0,
      fieldTypeCompatibility: ['Int', 'Float', 'BigInt'],
    },
    {
      methodName: 'finite',
      zodMethod: 'finite',
      parameterCount: 0,
      fieldTypeCompatibility: ['Float'],
    },
    {
      methodName: 'safe',
      zodMethod: 'safe',
      parameterCount: 0,
      fieldTypeCompatibility: ['Int', 'Float'],
    },
    {
      methodName: 'multipleOf',
      zodMethod: 'multipleOf',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['Int', 'Float'],
    },

    // Array validation methods
    { methodName: 'min', zodMethod: 'min', parameterCount: 1, fieldTypeCompatibility: ['Array'] },
    { methodName: 'max', zodMethod: 'max', parameterCount: 1, fieldTypeCompatibility: ['Array'] },
    {
      methodName: 'length',
      zodMethod: 'length',
      parameterCount: 1,
      fieldTypeCompatibility: ['Array'],
    },
    {
      methodName: 'nonempty',
      zodMethod: 'nonempty',
      parameterCount: 0,
      fieldTypeCompatibility: ['Array'],
    },

    // Date validation methods
    {
      methodName: 'min',
      zodMethod: 'min',
      parameterCount: 1,
      fieldTypeCompatibility: ['DateTime'],
    },
    {
      methodName: 'max',
      zodMethod: 'max',
      parameterCount: 1,
      fieldTypeCompatibility: ['DateTime'],
    },

    // Custom validation methods
    { methodName: 'refine', zodMethod: 'refine', parameterCount: 'variable' },
    { methodName: 'transform', zodMethod: 'transform', parameterCount: 1 },
    { methodName: 'optional', zodMethod: 'optional', parameterCount: 0 },
    { methodName: 'nullable', zodMethod: 'nullable', parameterCount: 0 },
    { methodName: 'nullish', zodMethod: 'nullish', parameterCount: 0 },
    { methodName: 'default', zodMethod: 'default', parameterCount: 1 },
    {
      methodName: 'enum',
      zodMethod: 'enum',
      parameterCount: 1,
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'datetime',
      zodMethod: 'datetime',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    { methodName: 'object', zodMethod: 'object', parameterCount: 0 },
    { methodName: 'array', zodMethod: 'array', parameterCount: 'variable' },
    {
      methodName: 'json',
      zodMethod: 'json',
      parameterCount: 0,
      fieldTypeCompatibility: ['Json'],
    },

    // New Zod v4 string format methods - Issue #233
    // Network/URL validation methods
    {
      methodName: 'httpUrl',
      zodMethod: 'httpUrl',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'hostname',
      zodMethod: 'hostname',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },

    // Identifier validation methods
    {
      methodName: 'nanoid',
      zodMethod: 'nanoid',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'cuid',
      zodMethod: 'cuid',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'cuid2',
      zodMethod: 'cuid2',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'ulid',
      zodMethod: 'ulid',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },

    // Encoding validation methods
    {
      methodName: 'base64',
      zodMethod: 'base64',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'base64url',
      zodMethod: 'base64url',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'hex',
      zodMethod: 'hex',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },

    // Security/Crypto validation methods
    {
      methodName: 'jwt',
      zodMethod: 'jwt',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'hash',
      zodMethod: 'hash',
      parameterCount: 1, // Takes algorithm parameter like "sha256"
      fieldTypeCompatibility: ['String'],
    },

    // Network validation methods
    {
      methodName: 'ipv4',
      zodMethod: 'ipv4',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'ipv6',
      zodMethod: 'ipv6',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'cidrv4',
      zodMethod: 'cidrv4',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'cidrv6',
      zodMethod: 'cidrv6',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },

    // Character validation methods
    {
      methodName: 'emoji',
      zodMethod: 'emoji',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },

    // ISO date/time validation methods
    {
      methodName: 'isoDate',
      zodMethod: 'iso.date',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'isoTime',
      zodMethod: 'iso.time',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'isoDatetime',
      zodMethod: 'iso.datetime',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },
    {
      methodName: 'isoDuration',
      zodMethod: 'iso.duration',
      parameterCount: 'variable',
      fieldTypeCompatibility: ['String'],
    },

    // Custom schema method - replaces base type entirely
    {
      methodName: 'custom',
      zodMethod: 'object', // This will be overridden in special handling
      parameterCount: 1,
      fieldTypeCompatibility: ['Json'], // Only works with Json fields
    },

    // Note: Removed 'string', 'number', 'boolean' method configs as they duplicate base types
  ];

  // If field type is provided, find the config that matches both method name and field type
  if (fieldType) {
    const compatibleConfigs = configs.filter(
      (config) =>
        config.methodName === methodName &&
        (!config.fieldTypeCompatibility || config.fieldTypeCompatibility.includes(fieldType)),
    );

    if (compatibleConfigs.length > 0) {
      return compatibleConfigs[0];
    }
  }

  // Fallback to first match by method name only
  return configs.find((config) => config.methodName === methodName) || null;
}

/**
 * Format parameters for Zod method calls
 *
 * @param parameters - Array of parameter values
 * @returns Formatted parameter string
 */
function formatParameters(parameters: unknown[]): string {
  if (parameters.length === 0) {
    return '';
  }

  return parameters.map((param) => formatSingleParameter(param)).join(', ');
}

/**
 * Format parameters specifically for Zod v4 string format methods
 * These methods expect either string error messages or validation parameter objects
 *
 * From the Zod v4 API: all string format methods expect `string | core.$ZodCheck{Method}Params`
 * These are validation parameters, not configuration parameters
 *
 * @param method - The method name (nanoid, jwt, base64, etc.)
 * @param parameters - Array of parameters to format
 * @returns Formatted parameter string or empty string
 */
function formatV4StringFormatParameters(_method: string, parameters: any[] | undefined): string {
  if (!parameters || parameters.length === 0) {
    return '';
  }

  const firstParam = parameters[0];

  // For numeric/boolean parameters, preserve them as-is to maintain user intent
  // Even if they result in invalid TypeScript, let the user fix their annotations
  if (typeof firstParam === 'number' || typeof firstParam === 'boolean') {
    return formatParameters(parameters);
  }

  // For string parameters, format them normally as error messages
  if (typeof firstParam === 'string') {
    return formatSingleParameter(firstParam);
  }

  // For other types (objects, arrays), format normally
  return formatParameters(parameters);
}

/**
 * Format a single parameter for Zod method calls
 *
 * @param param - Parameter value
 * @returns Formatted parameter string
 */
function formatSingleParameter(param: unknown): string {
  if (param === null) {
    return 'null';
  }

  if (param === undefined) {
    return 'undefined';
  }

  if (typeof param === 'string') {
    // Check if it's a complex expression that shouldn't be quoted
    // Complex expressions include: new Date(), RegExp(), function calls, or dotted calls like z.string()
    if (param.match(/^(new\s+\w+\(|RegExp\(|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\()/)) {
      return param; // Return complex expressions as-is
    }
    // Prefer double quotes for URL-like strings (e.g., https://) to match snapshots
    if (/^https?:\/\//i.test(param)) {
      const escapedDq = param.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escapedDq}"`;
    }
    // Default: single quotes for plain strings (error messages, enum values, etc.)
    const escapedSq = param.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escapedSq}'`;
  }

  if (typeof param === 'number' || typeof param === 'boolean') {
    return String(param);
  }

  if (param instanceof RegExp) {
    return param.toString();
  }

  if (Array.isArray(param)) {
    return `[${param.map(formatSingleParameter).join(', ')}]`;
  }

  if (typeof param === 'object') {
    // Handle special JavaScript object literal marker
    if (param && typeof param === 'object' && '__js_object_literal__' in param) {
      // Return the raw JavaScript object literal without quotes
      return (param as { __js_object_literal__: string }).__js_object_literal__;
    }
    return JSON.stringify(param);
  }

  // Fallback for unknown types
  return String(param);
}

/**
 * Generate complete Zod schema with base type and validations
 *
 * @param baseType - Base Zod type (e.g., 'z.string()', 'z.number()')
 * @param annotations - Parsed annotations
 * @param context - Field context
 * @returns Complete schema generation result
 */
export function generateCompleteZodSchema(
  baseType: string,
  annotations: ParsedZodAnnotation[],
  context: FieldCommentContext,
  zodVersion: 'auto' | 'v3' | 'v4' = 'auto',
): ZodSchemaGenerationResult {
  const validationResult = mapAnnotationsToZodSchema(annotations, context, zodVersion);

  if (!validationResult.isValid) {
    return validationResult;
  }

  // Combine base type with validation chain
  let schemaChain = validationResult.schemaChain;

  // Check if the schema chain is a replacement method (doesn't start with dot)
  const hasChain = schemaChain.length > 0;
  const isReplacementSchema = hasChain && !schemaChain.startsWith('.');

  let fullSchema: string;
  if (!hasChain) {
    // No validations to apply; return base type untouched
    fullSchema = baseType;
  } else if (isReplacementSchema) {
    // For replacement schemas (json, enum), use them directly instead of concatenating
    fullSchema = schemaChain;
  } else {
    // Remove redundant .optional() calls if base type already includes .optional()
    if (baseType.includes('.optional()') && schemaChain.includes('.optional()')) {
      // Remove all .optional() calls from the chain since base type already handles optionality
      schemaChain = schemaChain.replace(/\.optional\(\)/g, '');
    }

    // Regular concatenation for chaining methods
    fullSchema = baseType + schemaChain;
  }

  return {
    schemaChain: fullSchema,
    imports: validationResult.imports,
    errors: validationResult.errors,
    isValid: validationResult.isValid,
  };
}

/**
 * Get base Zod type for Prisma field type
 *
 * @param fieldType - Prisma field type
 * @param isOptional - Whether field is optional
 * @param isList - Whether field is a list
 * @returns Base Zod type string
 */
export function getBaseZodType(fieldType: string, isOptional: boolean, isList: boolean): string {
  let baseType: string;

  switch (fieldType) {
    case 'String':
      baseType = 'z.string()';
      break;
    case 'Int':
      baseType = 'z.number().int()';
      break;
    case 'Float':
      baseType = 'z.number()';
      break;
    case 'Boolean':
      baseType = 'z.boolean()';
      break;
    case 'DateTime':
      baseType = 'z.date()';
      break;
    case 'BigInt':
      baseType = 'z.bigint()';
      break;
    case 'Decimal':
      baseType = 'z.number()'; // or custom decimal schema
      break;
    case 'Json':
      baseType = 'z.unknown()'; // or z.record(z.unknown())
      break;
    case 'Bytes':
      baseType = 'z.instanceof(Uint8Array)'; // or custom bytes schema
      break;
    default:
      // Unknown complex type (enum or relation). Without field kind context use a safe fallback.
      baseType = 'z.unknown()';
      break;
  }

  // Handle arrays
  if (isList) {
    baseType = `z.array(${baseType})`;
  }

  // Handle optional fields
  if (isOptional) {
    baseType = `${baseType}.optional()`;
  }

  return baseType;
}

/**
 * Field-aware base type resolver to correctly handle enums vs relations.
 */
export function getBaseZodTypeForField(
  field: import('@prisma/generator-helper').DMMF.Field,
  isOptionalOverride?: boolean,
): string {
  const isOptional =
    typeof isOptionalOverride === 'boolean' ? isOptionalOverride : !field.isRequired;

  let baseType: string;
  switch (field.type) {
    case 'String':
      baseType = 'z.string()';
      break;
    case 'Int':
      baseType = 'z.number().int()';
      break;
    case 'Float':
      baseType = 'z.number()';
      break;
    case 'Boolean':
      baseType = 'z.boolean()';
      break;
    case 'DateTime':
      baseType = 'z.date()';
      break;
    case 'BigInt':
      baseType = 'z.bigint()';
      break;
    case 'Decimal':
      baseType = 'z.number()';
      break;
    case 'Json':
      baseType = 'z.unknown()';
      break;
    case 'Bytes':
      baseType = 'z.instanceof(Uint8Array)';
      break;
    default:
      if (field.kind === 'enum') {
        baseType = `${String(field.type)}Schema`;
      } else {
        baseType = 'z.unknown()';
      }
      break;
  }

  if (field.isList) {
    baseType = `z.array(${baseType})`;
  }
  if (isOptional) {
    baseType = `${baseType}.optional()`;
  }
  return baseType;
}

/**
 * Get required imports for Zod schema generation
 *
 * @param fieldType - Prisma field type
 * @param customImports - Additional imports from validation methods
 * @returns Set of import statements
 */
export function getRequiredImports(
  fieldType: string,
  customImports: Set<string> = new Set(),
): Set<string> {
  const imports = new Set<string>(customImports);

  // Always need zod
  imports.add('z');

  // Special imports for certain types
  switch (fieldType) {
    case 'Bytes':
      // Uint8Array is built-in, no import needed
      break;
    case 'DateTime':
      // Date is built-in, no import needed
      break;
    default:
      // Check if it's an enum type (would need enum import)
      if (!['String', 'Int', 'Float', 'Boolean', 'BigInt', 'Decimal', 'Json'].includes(fieldType)) {
        // This is likely an enum or model type - might need custom import
        imports.add(`${fieldType} // Enum import may be needed`);
      }
      break;
  }

  return imports;
}

/**
 * Convert a JavaScript object to a Zod object schema string
 */
function convertObjectToZodSchema(obj: any): string {
  const properties: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const zodType = inferZodTypeFromValue(value);
    properties.push(`${JSON.stringify(key)}: ${zodType}`);
  }

  return `{ ${properties.join(', ')} }`;
}

/**
 * Infer Zod type from a JavaScript value
 */
function inferZodTypeFromValue(value: any): string {
  if (typeof value === 'string') {
    return `z.string()`;
  } else if (typeof value === 'number') {
    return Number.isInteger(value) ? `z.number().int()` : `z.number()`;
  } else if (typeof value === 'boolean') {
    return `z.boolean()`;
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      return `z.array(z.unknown())`;
    }
    const firstElementType = inferZodTypeFromValue(value[0]);
    return `z.array(${firstElementType})`;
  } else if (value && typeof value === 'object') {
    return `z.object(${convertObjectToZodSchema(value)})`;
  } else if (value === null) {
    return `z.null()`;
  } else {
    return `z.unknown()`;
  }
}

/**
 * Detect if comment contains @zod.import annotations
 *
 * @param comment - Normalized comment string
 * @returns True if @zod.import annotations are detected
 */
export function detectCustomImports(comment: string): boolean {
  if (!comment) {
    return false;
  }

  // Look for @zod.import patterns (case-insensitive)
  const importPattern = /@zod\s*\.\s*import\s*\(/i;
  return importPattern.test(comment);
}

/**
 * Parse custom imports from a comment string
 *
 * Supports both model-level and field-level imports:
 * - @zod.import(["import { myFunction } from 'mypackage'"])
 * - @zod.import(["import myFunction from 'mypackage'"])
 * - @zod.import(["import * as myModule from 'mypackage'"])
 *
 * @param comment - Comment string to parse
 * @param context - Context for error reporting (model or field)
 * @returns Custom imports parsing result
 */
export function parseCustomImports(
  comment: string,
  context: ModelCommentContext | FieldCommentContext,
): CustomImportsParseResult {
  const result: CustomImportsParseResult = {
    imports: [],
    parseErrors: [],
    isValid: true,
    customSchema: undefined,
  };

  if (!comment || !detectCustomImports(comment)) {
    return result;
  }

  try {
    // Simpler approach: find @zod.import patterns and check for .custom.use after
    const importPattern = /@zod\s*\.\s*import\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/gi;
    let match;

    while ((match = importPattern.exec(comment)) !== null) {
      const importArrayString = match[1].trim();
      const endOfImport = match.index + match[0].length;
      const afterImport = comment.substring(endOfImport);

      // Look for validation methods after the import - support both field and model level
      let customSchemaString: string | null = null;

      // Field-level: .custom.use(...)
      const customUseMatch = afterImport.match(/^\s*\.\s*custom\s*\.\s*use\s*\(/);
      if (customUseMatch) {
        const startPos = customUseMatch.index! + customUseMatch[0].length;
        const endPos = findBalancedParentheses(afterImport, startPos);
        if (endPos !== -1) {
          customSchemaString = afterImport.substring(startPos, endPos).trim();
        }
      }

      // Model-level: .refine(...), .transform(...), etc.
      if (!customSchemaString) {
        const modelValidationMatch = afterImport.match(
          /^\s*\.\s*(refine|transform|superRefine|pipe)\s*\(/,
        );
        if (modelValidationMatch) {
          const method = modelValidationMatch[1];
          const startPos = modelValidationMatch.index! + modelValidationMatch[0].length;
          const endPos = findBalancedParentheses(afterImport, startPos);
          if (endPos !== -1) {
            const validationArgs = afterImport.substring(startPos, endPos).trim();
            customSchemaString = `${method}(${validationArgs})`;
          }
        }
      }

      try {
        // Parse the import array - it should be a JSON array of strings
        const importStatements = parseImportArray(importArrayString, context);

        // Process each import statement
        for (const importStatement of importStatements) {
          const customImport = parseImportStatement(importStatement, context);
          if (customImport) {
            result.imports.push(customImport);
          }
        }

        // Store the custom schema if present
        if (customSchemaString) {
          result.customSchema = customSchemaString;
        }
      } catch (error) {
        const contextStr =
          'fieldName' in context
            ? `${context.modelName}.${context.fieldName}`
            : `${context.modelName}`;

        result.parseErrors.push(
          `${contextStr}: Failed to parse import array: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.isValid = false;
      }
    }

    // Deduplicate imports by import statement
    result.imports = deduplicateImports(result.imports);
  } catch (error) {
    const contextStr =
      'fieldName' in context ? `${context.modelName}.${context.fieldName}` : `${context.modelName}`;

    result.parseErrors.push(
      `${contextStr}: Failed to parse custom imports: ${error instanceof Error ? error.message : String(error)}`,
    );
    result.isValid = false;
  }

  return result;
}

/**
 * Parse import array string into individual import statements
 *
 * @param importArrayString - String representation of import array
 * @param context - Context for error reporting
 * @returns Array of import statement strings
 */
function parseImportArray(
  importArrayString: string,
  _context: ModelCommentContext | FieldCommentContext,
): string[] {
  const trimmedInput = importArrayString.trim();

  if (!trimmedInput) {
    return [];
  }

  const statementsFromJson = parseImportArrayJson(trimmedInput);
  if (statementsFromJson.length > 0) {
    return statementsFromJson;
  }

  const fallbackStatements = extractImportStatements(trimmedInput);
  if (fallbackStatements.length > 0) {
    return fallbackStatements;
  }

  throw new Error(
    `Invalid import array format. Expected JSON array of strings, got: ${importArrayString}`,
  );
}

function extractImportStatements(segment: string): string[] {
  const cleanedSegment = stripWrappingQuotes(segment);

  if (!cleanedSegment) {
    return [];
  }

  const statements: string[] = [];
  const importRegex = /import\s+(?:type\s+)?[\s\S]*?from\s+['"`][^'"`]+['"`](?:\s*;)?/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(cleanedSegment)) !== null) {
    const statement = match[0].trim();
    if (statement) {
      statements.push(statement);
    }
  }

  if (!statements.length && cleanedSegment.startsWith('import')) {
    statements.push(cleanedSegment);
  }

  return statements;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];

    if (first === last && (first === '"' || first === "'" || first === '`')) {
      const inner = trimmed.slice(1, -1);
      return unescapeString(inner);
    }
  }

  return trimmed;
}

function unescapeString(value: string): string {
  try {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return JSON.parse(`"${escaped}"`);
  } catch {
    return value;
  }
}

function parseImportArrayJson(raw: string): string[] {
  try {
    const jsonText = raw.startsWith('[') ? raw : `[${raw}]`;
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const statements: string[] = [];

    for (const entry of parsed) {
      if (typeof entry !== 'string') {
        continue;
      }

      const extracted = extractImportStatements(entry);
      statements.push(...extracted);
    }

    return statements;
  } catch {
    return [];
  }
}

/**
 * Parse a single import statement into a CustomImport object
 *
 * @param importStatement - Import statement string
 * @param context - Context for error reporting
 * @returns CustomImport object or null if invalid
 */
function parseImportStatement(
  importStatement: string,
  context: ModelCommentContext | FieldCommentContext,
): CustomImport | null {
  if (!importStatement || typeof importStatement !== 'string') {
    return null;
  }

  const trimmed = importStatement.trim();

  // Basic validation - must start with 'import' and contain 'from'
  if (!trimmed.startsWith('import ') || !trimmed.includes(' from ')) {
    const contextStr =
      'fieldName' in context ? `${context.modelName}.${context.fieldName}` : `${context.modelName}`;

    logger.warn(`${contextStr}: Invalid import statement format: ${trimmed}`);
    return null;
  }

  // Detect type-only imports
  const isTypeOnly = trimmed.startsWith('import type ');

  // Extract source module
  const fromMatch = trimmed.match(/from\s+['"`]([^'"`]+)['"`]/);
  if (!fromMatch) {
    const contextStr =
      'fieldName' in context ? `${context.modelName}.${context.fieldName}` : `${context.modelName}`;

    logger.warn(`${contextStr}: Could not extract source module from: ${trimmed}`);
    return null;
  }

  const source = fromMatch[1];

  // Extract import clause (everything between 'import' and 'from')
  // Skip 'import ' (6 chars) or 'import type ' (12 chars) based on type detection
  const importStartOffset = isTypeOnly ? 12 : 6;
  const importClause = trimmed.substring(importStartOffset, trimmed.indexOf(' from ')).trim();

  // Determine import type(s) and extract imported items
  let isDefault = false;
  let isNamespace = false;
  const importedItems: string[] = [];

  if (importClause.startsWith('* as ')) {
    isNamespace = true;
    const nameMatch = importClause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (nameMatch) {
      importedItems.push(nameMatch[1]);
    }
  } else {
    const namedStart = importClause.indexOf('{');
    const namedEnd = importClause.lastIndexOf('}');

    // Default portion (before named block)
    const defaultCandidate = namedStart > 0
      ? importClause.slice(0, namedStart).replace(/,?\s*$/, '').trim()
      : namedStart === -1
        ? importClause.trim().replace(/,?\s*$/, '')
        : '';

    if (defaultCandidate) {
      isDefault = true;
      importedItems.push(defaultCandidate);
    }

    // Named imports block
    if (namedStart !== -1 && namedEnd !== -1 && namedEnd > namedStart) {
      const namedBlock = importClause.slice(namedStart + 1, namedEnd);
      const namedItems = namedBlock
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const aliasMatch = item.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
          if (aliasMatch) {
            return aliasMatch[2];
          }

          const typeMatch = item.match(/^type\s+([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/i);
          if (typeMatch) {
            return typeMatch[2] ?? typeMatch[1];
          }

          return item;
        });

      importedItems.push(...namedItems);
    }
  }

  return {
    importStatement: trimmed,
    source,
    importedItems,
    isDefault,
    isNamespace,
    isTypeOnly,
    originalStatement: importStatement,
  };
}

/**
 * Find balanced parentheses in a string starting from a given position
 *
 * @param text - Text to search in
 * @param startPos - Starting position (after opening parenthesis)
 * @returns End position of balanced parentheses or -1 if not found
 */
function findBalancedParentheses(text: string, startPos: number): number {
  let depth = 1;
  let pos = startPos;

  while (pos < text.length && depth > 0) {
    const char = text[pos];
    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    }
    pos++;
  }

  return depth === 0 ? pos - 1 : -1;
}

/**
 * Deduplicate imports by import statement
 *
 * @param imports - Array of CustomImport objects
 * @returns Deduplicated array of CustomImport objects
 */
function deduplicateImports(imports: CustomImport[]): CustomImport[] {
  const seen = new Set<string>();
  const deduplicated: CustomImport[] = [];

  for (const customImport of imports) {
    if (!seen.has(customImport.importStatement)) {
      seen.add(customImport.importStatement);
      deduplicated.push(customImport);
    }
  }

  return deduplicated;
}

/**
 * Extract custom imports from model documentation
 *
 * @param model - Prisma DMMF model
 * @returns Custom imports parsing result
 */
export function extractModelCustomImports(model: DMMF.Model): CustomImportsParseResult {
  const modelComment = model.documentation || '';

  if (!modelComment.trim()) {
    return {
      imports: [],
      parseErrors: [],
      isValid: true,
      customSchema: undefined,
    };
  }

  const context: ModelCommentContext = {
    modelName: model.name,
    comment: modelComment,
  };

  return parseCustomImports(modelComment, context);
}

/**
 * Extract custom imports from field documentation
 *
 * @param field - Prisma DMMF field
 * @param modelName - Name of the model containing the field
 * @returns Custom imports parsing result
 */
export function extractFieldCustomImports(
  field: DMMF.Field,
  modelName: string,
): CustomImportsParseResult {
  const fieldComment = field.documentation || '';

  if (!fieldComment.trim()) {
    return {
      imports: [],
      parseErrors: [],
      isValid: true,
      customSchema: undefined,
    };
  }

  const context: FieldCommentContext = {
    modelName,
    fieldName: field.name,
    fieldType: field.type,
    comment: fieldComment,
    isOptional: !field.isRequired,
    isList: field.isList,
  };

  return parseCustomImports(fieldComment, context);
}
