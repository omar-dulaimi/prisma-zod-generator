import Ajv, { JSONSchemaType, ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import {
  ConfigurationSchema,
  ValidationError,
  ValidationErrorType,
  isValidOperation,
  isValidVariant,
  PRISMA_OPERATIONS,
  SCHEMA_VARIANTS,
  DEFAULT_CONFIG,
} from './schema';
import { GeneratorConfig } from './parser';

/**
 * Configuration validation result
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;

  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];

  /** The validated configuration (potentially with defaults applied) */
  config?: GeneratorConfig;

  /** Warnings that don't prevent usage but should be noted */
  warnings: string[];
}

/**
 * Validation context for cross-field validation
 */
interface ValidationContext {
  config: GeneratorConfig;
  errors: ValidationError[];
  warnings: string[];
  modelNames?: string[];
}

/**
 * Configuration validator class
 */
export class ConfigurationValidator {
  private readonly ajv: Ajv;
  private readonly validateConfig: ValidateFunction<GeneratorConfig>;

  constructor() {
    // Initialize AJV with strict mode and additional formats
    this.ajv = new Ajv({
      strict: true,
      allErrors: true,
      verbose: true,
      discriminator: true,
      removeAdditional: false,
    });

    // Add format validation (email, uri, etc.)
    addFormats(this.ajv);

    // Compile the configuration schema
    this.validateConfig = this.ajv.compile(ConfigurationSchema as JSONSchemaType<GeneratorConfig>);
  }

  /**
   * Validate a configuration object
   */
  public validate(config: unknown, modelNames?: string[]): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
    };

    // First, validate against JSON Schema
    const schemaValid = this.validateConfig(config);

    if (!schemaValid && this.validateConfig.errors) {
      result.errors.push(...this.convertAjvErrors(this.validateConfig.errors));
    }

    // If basic schema validation fails, return early
    if (!schemaValid) {
      return result;
    }

    // Cast to GeneratorConfig for further validation
    const typedConfig = config as GeneratorConfig;

    // Create validation context
    const context: ValidationContext = {
      config: typedConfig,
      errors: [...result.errors],
      warnings: [...result.warnings],
      modelNames,
    };

    // Perform cross-field and business logic validation
    this.validateCrossFieldConstraints(context);
    this.validateModelReferences(context);
    this.validateVariantConsistency(context);
    this.validateOperationConsistency(context);

    // Update result
    result.errors = context.errors;
    result.warnings = context.warnings;
    result.valid = result.errors.length === 0;

    if (result.valid) {
      result.config = this.applyDefaults(typedConfig);
    }

    return result;
  }

  /**
   * Validate configuration with Prisma model names
   */
  public validateWithModels(config: unknown, modelNames: string[]): ValidationResult {
    return this.validate(config, modelNames);
  }

  /**
   * Convert AJV validation errors to our error format
   */
  private convertAjvErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map((error) => this.convertSingleAjvError(error));
  }

  /**
   * Convert a single AJV error to our error format
   */
  private convertSingleAjvError(error: ErrorObject): ValidationError {
    const path = error.instancePath || 'root';

    switch (error.keyword) {
      case 'enum':
        return {
          type: ValidationErrorType.INVALID_JSON_SCHEMA,
          message: `Invalid value at ${path}. Expected one of: ${error.schema}`,
          path,
          value: error.data,
          allowedValues: Array.isArray(error.schema) ? error.schema : [error.schema],
        };

      case 'pattern':
        return {
          type: ValidationErrorType.INVALID_JSON_SCHEMA,
          message: `Invalid format at ${path}. ${this.getPatternErrorMessage(path, error.schema as string)}`,
          path,
          value: error.data,
        };

      case 'required':
        return {
          type: ValidationErrorType.MISSING_REQUIRED,
          message: `Missing required property: ${error.params?.missingProperty}`,
          path: `${path}/${error.params?.missingProperty}`,
          value: error.data,
        };

      case 'additionalProperties':
        return {
          type: ValidationErrorType.INVALID_JSON_SCHEMA,
          message: `Unknown property: ${error.params?.additionalProperty}`,
          path: `${path}/${error.params?.additionalProperty}`,
          value: error.data,
        };

      default:
        return {
          type: ValidationErrorType.INVALID_JSON_SCHEMA,
          message: error.message || 'Unknown validation error',
          path,
          value: error.data,
        };
    }
  }

  /**
   * Get human-readable error message for pattern validation failures
   */
  private getPatternErrorMessage(_path: string, pattern: string): string {
    if (pattern === '^[a-zA-Z_][a-zA-Z0-9_]*$') {
      return 'Must be a valid identifier (letters, numbers, underscores, cannot start with number)';
    }

    if (pattern === '^[A-Z][a-zA-Z0-9_]*$') {
      return 'Must be a valid model name (PascalCase, letters, numbers, underscores)';
    }

    if (pattern === '^\\.[a-zA-Z][a-zA-Z0-9_]*$') {
      return 'Must be a valid file suffix (start with dot, followed by identifier)';
    }

    if (pattern === '^[^<>:"|?*\\x00-\\x1f]+$') {
      return 'Must be a valid file path (no invalid characters)';
    }

    return `Must match pattern: ${pattern}`;
  }

  /**
   * Validate cross-field constraints
   */
  private validateCrossFieldConstraints(context: ValidationContext): void {
    const { config } = context;

    // Validate mode-specific constraints
    if (config.mode === 'minimal') {
      // In minimal mode, certain configurations don't make sense
      if (config.variants?.result?.enabled) {
        context.warnings.push('Result variants are not typically used in minimal mode');
      }

      if (config.models && Object.keys(config.models).length > 0) {
        // Check if any model has non-minimal operations
        Object.entries(config.models).forEach(([modelName, modelConfig]) => {
          if (modelConfig.operations) {
            const nonMinimalOps = modelConfig.operations.filter(
              (op) =>
                !['findMany', 'findUnique', 'create', 'update', 'delete', 'upsert'].includes(op),
            );
            if (nonMinimalOps.length > 0) {
              context.warnings.push(
                `Model ${modelName} has non-minimal operations in minimal mode: ${nonMinimalOps.join(', ')}`,
              );
            }
          }
        });
      }
    }

    // Validate variant suffix uniqueness
    if (config.variants) {
      const suffixes = new Set<string>();
      Object.entries(config.variants).forEach(([variantName, variantConfig]) => {
        if (variantConfig?.suffix) {
          if (suffixes.has(variantConfig.suffix)) {
            context.errors.push({
              type: ValidationErrorType.DUPLICATE_VALUES,
              message: `Duplicate suffix "${variantConfig.suffix}" found in variants`,
              path: `variants.${variantName}.suffix`,
              value: variantConfig.suffix,
            });
          }
          suffixes.add(variantConfig.suffix);
        }
      });
    }
  }

  /**
   * Validate model references against actual Prisma models
   */
  private validateModelReferences(context: ValidationContext): void {
    const { config, modelNames } = context;

    if (!modelNames || !config.models) {
      return;
    }

    // Check if configured models exist in Prisma schema
    Object.keys(config.models).forEach((configuredModel) => {
      if (!modelNames.includes(configuredModel)) {
        context.errors.push({
          type: ValidationErrorType.INVALID_MODEL_NAME,
          message: `Model "${configuredModel}" not found in Prisma schema`,
          path: `models.${configuredModel}`,
          value: configuredModel,
          allowedValues: modelNames,
        });
      }
    });

    // Warn about Prisma models not explicitly configured
    const unconfiguredModels = modelNames.filter(
      (modelName) => !config.models || !config.models[modelName],
    );

    if (unconfiguredModels.length > 0 && config.mode === 'custom') {
      context.warnings.push(
        `The following models are not configured and will use defaults: ${unconfiguredModels.join(', ')}`,
      );
    }
  }

  /**
   * Validate variant consistency
   */
  private validateVariantConsistency(context: ValidationContext): void {
    const { config } = context;

    if (!config.variants && !config.models) {
      return;
    }

    // Check for variant-specific field exclusions that reference non-existent variants
    if (config.models) {
      Object.entries(config.models).forEach(([modelName, modelConfig]) => {
        if (modelConfig.variants) {
          Object.keys(modelConfig.variants).forEach((variantName) => {
            if (!isValidVariant(variantName)) {
              context.errors.push({
                type: ValidationErrorType.INVALID_VARIANT,
                message: `Invalid variant name "${variantName}" in model ${modelName}`,
                path: `models.${modelName}.variants.${variantName}`,
                value: variantName,
                allowedValues: [...SCHEMA_VARIANTS],
              });
            }
          });
        }
      });
    }
  }

  /**
   * Validate operation consistency
   */
  private validateOperationConsistency(context: ValidationContext): void {
    const { config } = context;

    if (!config.models) {
      return;
    }

    Object.entries(config.models).forEach(([modelName, modelConfig]) => {
      if (modelConfig.operations) {
        // Check for invalid operations
        modelConfig.operations.forEach((operation) => {
          if (!isValidOperation(operation)) {
            context.errors.push({
              type: ValidationErrorType.INVALID_OPERATION,
              message: `Invalid operation "${operation}" for model ${modelName}`,
              path: `models.${modelName}.operations`,
              value: operation,
              allowedValues: [...PRISMA_OPERATIONS],
            });
          }
        });

        // Check for duplicate operations
        const uniqueOperations = new Set(modelConfig.operations);
        if (uniqueOperations.size !== modelConfig.operations.length) {
          context.errors.push({
            type: ValidationErrorType.DUPLICATE_VALUES,
            message: `Duplicate operations found for model ${modelName}`,
            path: `models.${modelName}.operations`,
            value: modelConfig.operations,
          });
        }
      }
    });
  }

  /**
   * Apply default values to configuration
   */
  private applyDefaults(config: GeneratorConfig): GeneratorConfig {
    return {
      mode: config.mode || DEFAULT_CONFIG.mode,
      output: config.output || DEFAULT_CONFIG.output,
      globalExclusions: config.globalExclusions || DEFAULT_CONFIG.globalExclusions,
      variants: {
        pure: {
          enabled: config.variants?.pure?.enabled ?? DEFAULT_CONFIG.variants.pure.enabled,
          suffix: config.variants?.pure?.suffix || DEFAULT_CONFIG.variants.pure.suffix,
          excludeFields: config.variants?.pure?.excludeFields || [],
        },
        input: {
          enabled: config.variants?.input?.enabled ?? DEFAULT_CONFIG.variants.input.enabled,
          suffix: config.variants?.input?.suffix || DEFAULT_CONFIG.variants.input.suffix,
          excludeFields: config.variants?.input?.excludeFields || [],
        },
        result: {
          enabled: config.variants?.result?.enabled ?? DEFAULT_CONFIG.variants.result.enabled,
          suffix: config.variants?.result?.suffix || DEFAULT_CONFIG.variants.result.suffix,
          excludeFields: config.variants?.result?.excludeFields || [],
        },
      },
      models: config.models || DEFAULT_CONFIG.models,
    };
  }
}

/**
 * Convenience function to validate configuration
 */
export function validateConfiguration(config: unknown, modelNames?: string[]): ValidationResult {
  const validator = new ConfigurationValidator();
  return validator.validate(config, modelNames);
}

/**
 * Convenience function to validate configuration with model names
 */
export function validateConfigurationWithModels(
  config: unknown,
  modelNames: string[],
): ValidationResult {
  const validator = new ConfigurationValidator();
  return validator.validateWithModels(config, modelNames);
}

/**
 * Create human-readable validation error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No validation errors';
  }

  let message = `Configuration validation failed with ${errors.length} error(s):\n\n`;

  errors.forEach((error, index) => {
    message += `${index + 1}. ${error.message}\n`;
    message += `   Path: ${error.path}\n`;

    if (error.value !== undefined) {
      message += `   Value: ${JSON.stringify(error.value)}\n`;
    }

    if (error.allowedValues && error.allowedValues.length > 0) {
      message += `   Allowed values: ${error.allowedValues.join(', ')}\n`;
    }

    message += '\n';
  });

  return message.trim();
}

/**
 * Create human-readable validation warnings message
 */
export function formatValidationWarnings(warnings: string[]): string {
  if (warnings.length === 0) {
    return '';
  }

  let message = `Configuration warnings (${warnings.length}):\n\n`;

  warnings.forEach((warning, index) => {
    message += `${index + 1}. ${warning}\n`;
  });

  return message.trim();
}
