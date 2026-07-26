/**
 * Zod Integration Helper
 *
 * Integrates @zod comment parsing with existing comment processing
 * and transformer workflows while maintaining backward compatibility.
 */

import { DMMF } from '@prisma/generator-helper';
import { logger } from '../utils/logger';
import {
  extractFieldComments,
  parseZodAnnotations,
  generateCompleteZodSchema,
  getBaseZodTypeForField,
  getRequiredImports,
  ExtractedFieldComment,
  extractModelCustomImports,
  extractFieldCustomImports,
  CustomImport,
} from '../parsers/zod-comments';

/**
 * Interface for field with enhanced Zod validation information
 */
export interface EnhancedFieldInfo {
  field: DMMF.Field;
  hasZodAnnotations: boolean;
  zodSchema?: string;
  zodImports: Set<string>;
  zodErrors: string[];
  fallbackToDefault: boolean;
  customImports: CustomImport[];
  customSchema?: string;
}

/**
 * Interface for model with enhanced field information
 */
export interface EnhancedModelInfo {
  model: DMMF.Model;
  enhancedFields: EnhancedFieldInfo[];
  allZodImports: Set<string>;
  hasAnyZodAnnotations: boolean;
  zodProcessingErrors: string[];
  modelCustomImports: CustomImport[];
  allCustomImports: CustomImport[];
}

/**
 * Process models to extract and integrate @zod annotations
 *
 * This function processes all models and their fields to:
 * 1. Extract @zod annotations from field comments
 * 2. Generate Zod schema strings for annotated fields
 * 3. Maintain compatibility with existing comment processing
 * 4. Collect import requirements and error information
 *
 * @param models - Array of Prisma DMMF models
 * @param options - Processing options
 * @returns Enhanced model information with Zod integration
 */
export function processModelsWithZodIntegration(
  models: DMMF.Model[],
  options: ZodIntegrationOptions = {},
): EnhancedModelInfo[] {
  const enhancedModels: EnhancedModelInfo[] = [];

  for (const model of models) {
    try {
      const enhancedModel = processModelWithZodIntegration(model, options);
      enhancedModels.push(enhancedModel);
    } catch (error) {
      // Handle model processing errors gracefully
      console.warn(`Failed to process model ${model.name} for Zod integration:`, error);

      // Create fallback model info
      enhancedModels.push({
        model,
        enhancedFields: model.fields.map((field) => createFallbackFieldInfo(field)),
        allZodImports: new Set(),
        hasAnyZodAnnotations: false,
        zodProcessingErrors: [
          `Model processing failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        modelCustomImports: [],
        allCustomImports: [],
      });
    }
  }

  return enhancedModels;
}

/**
 * Options for Zod integration processing
 */
export interface ZodIntegrationOptions {
  /** Whether to enable @zod annotation processing (default: true) */
  enableZodAnnotations?: boolean;

  /** Whether to generate fallback schemas for fields without annotations (default: true) */
  generateFallbackSchemas?: boolean;

  /** Whether to validate annotation compatibility with field types (default: true) */
  validateTypeCompatibility?: boolean;

  /** Whether to collect detailed error information (default: true) */
  collectDetailedErrors?: boolean;

  /** Custom base types for specific field types */
  customBaseTypes?: Record<string, string>;

  /** Zod version target for version-specific handling */
  zodVersion?: 'auto' | 'v3' | 'v4';
}

/**
 * Process a single model with Zod integration
 *
 * @param model - Prisma DMMF model
 * @param options - Processing options
 * @returns Enhanced model information
 */
function processModelWithZodIntegration(
  model: DMMF.Model,
  options: ZodIntegrationOptions,
): EnhancedModelInfo {
  const enhancedFields: EnhancedFieldInfo[] = [];
  const allZodImports = new Set<string>();
  const zodProcessingErrors: string[] = [];
  let hasAnyZodAnnotations = false;

  // Extract model-level custom imports
  const modelCustomImportsResult = extractModelCustomImports(model);
  const modelCustomImports = modelCustomImportsResult.imports;
  zodProcessingErrors.push(...modelCustomImportsResult.parseErrors);

  // Extract comments from all fields in the model
  const extractedComments = extractFieldComments([model]);

  // Create a map for quick field comment lookup
  const commentMap = new Map<string, ExtractedFieldComment>();
  extractedComments.forEach((comment) => {
    commentMap.set(comment.context.fieldName, comment);
  });

  // Process each field
  for (const field of model.fields) {
    try {
      const enhancedField = processFieldWithZodIntegration(field, model, commentMap, options);
      enhancedFields.push(enhancedField);

      // Collect imports and track annotations
      enhancedField.zodImports.forEach((imp) => allZodImports.add(imp));
      if (enhancedField.hasZodAnnotations) {
        hasAnyZodAnnotations = true;
      }

      // Collect errors
      zodProcessingErrors.push(...enhancedField.zodErrors);
    } catch (error) {
      // Handle field processing errors gracefully
      console.warn(`Failed to process field ${field.name} in model ${model.name}:`, error);

      const fallbackField = createFallbackFieldInfo(field);
      fallbackField.zodErrors.push(
        `Field processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      enhancedFields.push(fallbackField);
    }
  }

  // Collect all custom imports (model-level + field-level)
  const allCustomImports = [...modelCustomImports];
  enhancedFields.forEach((field) => {
    allCustomImports.push(...field.customImports);
  });

  return {
    model,
    enhancedFields,
    allZodImports,
    hasAnyZodAnnotations,
    zodProcessingErrors: zodProcessingErrors.filter((error) => error.length > 0),
    modelCustomImports,
    allCustomImports,
  };
}

/**
 * Process a single field with Zod integration
 *
 * @param field - Prisma DMMF field
 * @param model - Parent model
 * @param commentMap - Map of field comments
 * @param options - Processing options
 * @returns Enhanced field information
 */
function processFieldWithZodIntegration(
  field: DMMF.Field,
  model: DMMF.Model,
  commentMap: Map<string, ExtractedFieldComment>,
  options: ZodIntegrationOptions,
): EnhancedFieldInfo {
  const enhancedField: EnhancedFieldInfo = {
    field,
    hasZodAnnotations: false,
    zodImports: new Set(),
    zodErrors: [],
    fallbackToDefault: false,
    customImports: [],
  };

  // Extract field-level custom imports
  const fieldCustomImportsResult = extractFieldCustomImports(field, model.name);
  enhancedField.customImports = fieldCustomImportsResult.imports;
  enhancedField.customSchema = fieldCustomImportsResult.customSchema;
  enhancedField.zodErrors.push(...fieldCustomImportsResult.parseErrors);

  // Check if Zod annotation processing is enabled
  if (options.enableZodAnnotations === false) {
    enhancedField.fallbackToDefault = true;
    return enhancedField;
  }

  // Get comment for this field
  const extractedComment = commentMap.get(field.name);

  if (!extractedComment || !extractedComment.hasZodAnnotations) {
    // No @zod annotations found
    if (options.generateFallbackSchemas !== false) {
      enhancedField.zodSchema = generateFallbackSchema(field);
      enhancedField.zodImports = getRequiredImports(field.type);
    }
    enhancedField.fallbackToDefault = true;
    return enhancedField;
  }

  // Process @zod annotations
  try {
    const parseResult = parseZodAnnotations(
      extractedComment.normalizedComment,
      extractedComment.context,
    );

    if (!parseResult.isValid) {
      enhancedField.zodErrors.push(...parseResult.parseErrors);
      enhancedField.fallbackToDefault = true;
      // Surface the rejection — silently dropping @zod annotations means
      // users ship schemas without the validation they wrote (issue #374).
      logger.warn(
        `[prisma-zod-generator] Skipping @zod annotations for field "${field.name}":`,
        parseResult.parseErrors.join('; '),
      );
      return enhancedField;
    }

    // Generate Zod schema from annotations
    const baseType = getBaseZodTypeForField(field);
    const schemaResult = generateCompleteZodSchema(
      baseType,
      parseResult.annotations,
      extractedComment.context,
      options.zodVersion || 'auto',
    );

    if (schemaResult.isValid) {
      enhancedField.hasZodAnnotations = true;
      enhancedField.zodSchema = schemaResult.schemaChain;
      enhancedField.zodImports = schemaResult.imports;
    } else {
      enhancedField.zodErrors.push(...schemaResult.errors);
      enhancedField.fallbackToDefault = true;

      // Generate fallback if enabled
      if (options.generateFallbackSchemas !== false) {
        enhancedField.zodSchema = generateFallbackSchema(field);
        enhancedField.zodImports = getRequiredImports(field.type);
      }
    }
  } catch (error) {
    enhancedField.zodErrors.push(
      `Annotation processing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    enhancedField.fallbackToDefault = true;

    // Generate fallback if enabled
    if (options.generateFallbackSchemas !== false) {
      enhancedField.zodSchema = generateFallbackSchema(field);
      enhancedField.zodImports = getRequiredImports(field.type);
    }
  }

  return enhancedField;
}

/**
 * Create fallback field info for error cases
 *
 * @param field - Prisma DMMF field
 * @returns Fallback enhanced field info
 */
function createFallbackFieldInfo(field: DMMF.Field): EnhancedFieldInfo {
  return {
    field,
    hasZodAnnotations: false,
    zodSchema: generateFallbackSchema(field),
    zodImports: getRequiredImports(field.type),
    zodErrors: [],
    fallbackToDefault: true,
    customImports: [],
    customSchema: undefined,
  };
}

/**
 * Generate fallback Zod schema for field without annotations
 *
 * @param field - Prisma DMMF field
 * @returns Fallback Zod schema string
 */
function generateFallbackSchema(field: DMMF.Field): string {
  return getBaseZodTypeForField(field);
}

/**
 * Check if existing comment processing should be preserved
 *
 * This function ensures backward compatibility by checking if a field
 * comment contains existing comment directives that should be processed
 * by the original comment processing system.
 *
 * @param comment - Field comment string
 * @returns True if existing processing should be preserved
 */
export function shouldPreserveExistingCommentProcessing(comment: string): boolean {
  if (!comment) {
    return false;
  }

  // Check for existing comment directives that should be preserved
  const existingDirectives = [
    /@Gen\./, // Existing generator directives
    /@@/, // Model-level directives
    /@map/, // Mapping directives
    /@ignore/, // Ignore directives
  ];

  return existingDirectives.some((directive) => directive.test(comment));
}

/**
 * Extract non-Zod comment content for backward compatibility
 *
 * @param comment - Original comment string
 * @returns Comment content with @zod annotations removed
 */
export function extractNonZodCommentContent(comment: string): string {
  if (!comment) {
    return '';
  }

  // Remove @zod annotations while preserving other content
  const zodPattern = /@zod(\.[a-zA-Z_][a-zA-Z0-9_]*\s*(\([^)]*\))?)+/gi;
  const cleanedComment = comment.replace(zodPattern, '').trim();

  // Clean up extra whitespace
  return cleanedComment.replace(/\s+/g, ' ').trim();
}

/*
 * getZodIntegrationStatistics and integrateZodWithExistingComments were removed as
 * unreachable — no caller inside or outside this module. processModelsWithZodIntegration is
 * the entry point the generator actually uses.
 */
