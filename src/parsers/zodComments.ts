/**
 * Zod Comment Parser
 *
 * Parses @zod validation annotations from Prisma schema field comments
 * to generate enhanced Zod validation schemas.
 */

import { DMMF } from '@prisma/generator-helper';

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

  // Look for @zod patterns (case-insensitive)
  const zodPattern = /@zod\./i;
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
 * Validate basic @zod annotation syntax
 *
 * @param comment - Comment to validate
 * @param context - Field context for error reporting
 * @returns Array of syntax validation errors
 */
function validateZodSyntax(comment: string, context: FieldCommentContext): string[] {
  const errors: string[] = [];

  // Look for @zod annotations and validate basic structure
  const zodMatches = comment.match(/@zod\.[a-zA-Z_][a-zA-Z0-9_]*(\([^)]*\))?/gi);

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
      // Handle simple @zod annotations
      // Matches: @zod.methodName(), @zod.methodName(param), @zod.methodName(param1, param2)
      const zodPattern = /@zod\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))?/gi;

      let match;
      while ((match = zodPattern.exec(comment)) !== null) {
        try {
          const annotation = parseZodAnnotation(match, context);
          result.annotations.push(annotation);
        } catch (error) {
          const errorMessage = `Failed to parse @zod annotation "${match[0]}": ${error instanceof Error ? error.message : String(error)}`;
          result.parseErrors.push(errorMessage);
          result.isValid = false;
        }
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
          console.warn('Some @zod annotations were invalid and filtered out:', validationErrors);
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

  // Objects (basic support)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`Invalid object: ${trimmed}`);
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
  ];

  // Methods that don't allow parameters
  const noParams = ['email', 'url', 'uuid', 'nonempty', 'trim', 'toLowerCase', 'toUpperCase'];

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
  ];

  // Check if method is known
  const allKnownMethods = [
    ...new Set([
      ...stringMethods,
      ...numberMethods,
      ...arrayMethods,
      ...additionalMethods,
      ...optionalErrorMessage,
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
  parameterTypes?: string[];
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
 * @returns Schema generation result with method chain and imports
 */
export function mapAnnotationsToZodSchema(
  annotations: ParsedZodAnnotation[],
  context: FieldCommentContext,
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

    for (const annotation of annotations) {
      try {
        const methodCall = mapAnnotationToZodMethod(annotation, context);
        methodCalls.push(methodCall.methodCall);

        // Add any required imports
        if (methodCall.requiredImport) {
          result.imports.add(methodCall.requiredImport);
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
      result.schemaChain = methodCalls.join('');
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
}

/**
 * Map a single annotation to a Zod method call
 *
 * @param annotation - Parsed annotation
 * @param context - Field context
 * @returns Method mapping result
 */
function mapAnnotationToZodMethod(
  annotation: ParsedZodAnnotation,
  context: FieldCommentContext,
): MethodMappingResult {
  const { method, parameters } = annotation;

  // Get method configuration
  const methodConfig = getValidationMethodConfig(method, context.fieldType);

  if (!methodConfig) {
    // Unknown method - pass through as-is with warning
    console.warn(`Unknown @zod method: ${method} - generating as-is`);
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

  // Generate the method call
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
      parameterCount: 0,
      fieldTypeCompatibility: ['String'],
    },
    { methodName: 'url', zodMethod: 'url', parameterCount: 0, fieldTypeCompatibility: ['String'] },
    {
      methodName: 'uuid',
      zodMethod: 'uuid',
      parameterCount: 0,
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
      parameterCount: 0,
      fieldTypeCompatibility: ['String'],
    },
    { methodName: 'object', zodMethod: 'object', parameterCount: 0 },
    { methodName: 'array', zodMethod: 'array', parameterCount: 'variable' },
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
    return `'${param.replace(/'/g, "\\'")}'`;
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
): ZodSchemaGenerationResult {
  const validationResult = mapAnnotationsToZodSchema(annotations, context);

  if (!validationResult.isValid) {
    return validationResult;
  }

  // Combine base type with validation chain
  let schemaChain = validationResult.schemaChain;

  // Remove redundant .optional() calls if base type already includes .optional()
  if (baseType.includes('.optional()') && schemaChain.includes('.optional()')) {
    // Remove all .optional() calls from the chain since base type already handles optionality
    schemaChain = schemaChain.replace(/\.optional\(\)/g, '');
  }

  const fullSchema = baseType + schemaChain;

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
      // Enum or model type
      baseType = `z.enum(${fieldType})`;
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
