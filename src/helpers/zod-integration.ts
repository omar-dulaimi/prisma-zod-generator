/**
 * Zod Integration Helper
 *
 * Integrates @zod comment parsing with existing comment processing
 * and transformer workflows while maintaining backward compatibility.
 */

import { DMMF } from '@prisma/generator-helper';
import {
  extractFieldComments,
  parseZodAnnotations,
  generateCompleteZodSchema,
  getBaseZodType,
  getRequiredImports,
  ExtractedFieldComment,
} from '../parsers/zodComments';

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

  return {
    model,
    enhancedFields,
    allZodImports,
    hasAnyZodAnnotations,
    zodProcessingErrors: zodProcessingErrors.filter((error) => error.length > 0),
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
  };

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
      return enhancedField;
    }

    // Generate Zod schema from annotations
    const baseType = getBaseZodType(field.type, !field.isRequired, field.isList);
    const schemaResult = generateCompleteZodSchema(
      baseType,
      parseResult.annotations,
      extractedComment.context,
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
  };
}

/**
 * Generate fallback Zod schema for field without annotations
 *
 * @param field - Prisma DMMF field
 * @returns Fallback Zod schema string
 */
function generateFallbackSchema(field: DMMF.Field): string {
  return getBaseZodType(field.type, !field.isRequired, field.isList);
}

/**
 * Get integration statistics for reporting
 *
 * @param enhancedModels - Array of enhanced model information
 * @returns Integration statistics
 */
export function getZodIntegrationStatistics(enhancedModels: EnhancedModelInfo[]): {
  totalModels: number;
  modelsWithZodAnnotations: number;
  totalFields: number;
  fieldsWithZodAnnotations: number;
  totalErrors: number;
  uniqueImports: number;
} {
  const stats = {
    totalModels: enhancedModels.length,
    modelsWithZodAnnotations: 0,
    totalFields: 0,
    fieldsWithZodAnnotations: 0,
    totalErrors: 0,
    uniqueImports: 0,
  };

  const allImports = new Set<string>();

  for (const enhancedModel of enhancedModels) {
    if (enhancedModel.hasAnyZodAnnotations) {
      stats.modelsWithZodAnnotations++;
    }

    stats.totalFields += enhancedModel.enhancedFields.length;
    stats.totalErrors += enhancedModel.zodProcessingErrors.length;

    for (const enhancedField of enhancedModel.enhancedFields) {
      if (enhancedField.hasZodAnnotations) {
        stats.fieldsWithZodAnnotations++;
      }

      stats.totalErrors += enhancedField.zodErrors.length;
      enhancedField.zodImports.forEach((imp) => allImports.add(imp));
    }
  }

  stats.uniqueImports = allImports.size;
  return stats;
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

/**
 * Integration wrapper that maintains backward compatibility
 *
 * This function provides a drop-in replacement for existing comment processing
 * while adding @zod annotation support.
 *
 * @param models - Array of Prisma DMMF models
 * @param options - Integration options
 * @returns Models with both existing and Zod comment processing applied
 */
export function integrateZodWithExistingComments(
  models: DMMF.Model[],
  options: ZodIntegrationOptions = {},
): {
  enhancedModels: EnhancedModelInfo[];
  backwardCompatibilityPreserved: boolean;
  integrationWarnings: string[];
} {
  const integrationWarnings: string[] = [];
  let backwardCompatibilityPreserved = true;

  try {
    // Process models with Zod integration
    const enhancedModels = processModelsWithZodIntegration(models, options);

    // Check for backward compatibility concerns
    for (const enhancedModel of enhancedModels) {
      for (const enhancedField of enhancedModel.enhancedFields) {
        const originalComment = enhancedField.field.documentation || '';

        if (shouldPreserveExistingCommentProcessing(originalComment)) {
          const nonZodContent = extractNonZodCommentContent(originalComment);
          if (nonZodContent.length > 0) {
            integrationWarnings.push(
              `Field ${enhancedModel.model.name}.${enhancedField.field.name} has both @zod annotations and existing comment directives. ` +
                `Existing directives: "${nonZodContent}"`,
            );
          }
        }
      }
    }

    return {
      enhancedModels,
      backwardCompatibilityPreserved,
      integrationWarnings,
    };
  } catch (error) {
    backwardCompatibilityPreserved = false;
    integrationWarnings.push(
      `Integration failed: ${error instanceof Error ? error.message : String(error)}`,
    );

    // Return fallback data
    return {
      enhancedModels: models.map((model) => ({
        model,
        enhancedFields: model.fields.map(createFallbackFieldInfo),
        allZodImports: new Set(),
        hasAnyZodAnnotations: false,
        zodProcessingErrors: ['Integration fallback due to processing error'],
      })),
      backwardCompatibilityPreserved,
      integrationWarnings,
    };
  }
}
