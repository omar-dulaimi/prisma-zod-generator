import { JSONSchema7 } from 'json-schema';

/**
 * Comprehensive JSON Schema for Prisma Zod Generator configuration
 *
 * This schema defines strict validation rules for all configuration options
 * including data types, constraints, and allowed values.
 */
export const ConfigurationSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Prisma Zod Generator Configuration',
  description: 'Configuration schema for the Prisma Zod Generator',
  type: 'object',
  additionalProperties: false,
  properties: {
    mode: {
      type: 'string',
      enum: ['full', 'minimal', 'custom'],
      default: 'full',
      description: 'Generation mode: full (all schemas), minimal (basic CRUD only), or custom',
    },

    output: {
      type: 'string',
      minLength: 1,
      pattern: '^[^<>:"|?*\\x00-\\x1f]+$',
      description: 'Output directory path for generated schemas',
    },

    useMultipleFiles: {
      type: 'boolean',
      default: true,
      description:
        'When true (default), generate multiple files; when false, generate a single bundled file',
    },
    singleFileName: {
      type: 'string',
      minLength: 1,
      default: 'schemas.ts',
      description: 'Name of the single bundled file when useMultipleFiles is false',
    },
    placeSingleFileAtRoot: {
      type: 'boolean',
      default: true,
      description:
        'When bundling to a single file, place it at the output root instead of a schemas/ subdirectory',
    },
    placeArrayVariantsAtRoot: {
      type: 'boolean',
      default: true,
      description:
        'When using array-based variants, place them at schemas root; if false, under variants/',
    },
    formatGeneratedSchemas: {
      type: 'boolean',
      default: false,
      description: 'Whether to run a formatter on generated schemas',
    },
    pureModels: {
      type: 'boolean',
      default: false,
      description: 'Whether to generate pure model schemas',
    },
    pureModelsLean: {
      type: 'boolean',
      default: true,
      description: 'Emit lean pure model schemas (no verbose JSDoc/statistics/comments)',
    },
    pureModelsIncludeRelations: {
      type: 'boolean',
      default: false,
      description:
        'When pureModels is true, include relation fields. Default false (omit relation fields for slimmer models)',
    },
    pureModelsExcludeCircularRelations: {
      type: 'boolean',
      default: false,
      description:
        'When pureModelsIncludeRelations is true, exclude relation fields that would create circular references. Keeps foreign key fields but omits relation object fields to avoid TypeScript circular dependency errors.',
    },
    naming: {
      type: 'object',
      additionalProperties: false,
      description: 'Optional naming customization settings (experimental)',
      properties: {
        preset: {
          type: 'string',
          enum: ['default', 'zod-prisma', 'zod-prisma-types', 'legacy-model-suffix'],
          description: 'Predefined naming preset to apply',
        },
        pureModel: {
          type: 'object',
          additionalProperties: false,
          description: 'Overrides for pure model file and symbol naming',
          properties: {
            filePattern: {
              type: 'string',
              minLength: 3,
              maxLength: 80,
              description:
                'Pattern for pure model file names. Tokens: {Model}, {model}, {camel}, {kebab}. Must end with .ts',
              pattern: '.*\\.ts$',
            },
            schemaSuffix: {
              type: 'string',
              minLength: 0,
              maxLength: 30,
              pattern: '^[A-Z][A-Za-z0-9_]*$|^$',
              description:
                'Suffix appended to schema variable (e.g. Schema). Empty string allowed.',
            },
            typeSuffix: {
              type: 'string',
              minLength: 0,
              maxLength: 30,
              pattern: '^[A-Z][A-Za-z0-9_]*$|^$',
              description:
                'Suffix appended to inferred type export (e.g. Type). Empty string allowed.',
            },
            exportNamePattern: {
              type: 'string',
              minLength: 0,
              maxLength: 80,
              description:
                'Pattern for schema export variable. Tokens: {Model} {model} plus optional suffix tokens {SchemaSuffix}. Defaults derived from schemaSuffix.',
            },
            legacyAliases: {
              type: 'boolean',
              default: false,
              description:
                'Emit deprecated alias exports (e.g. UserModel) for compatibility when preset supplies them.',
            },
          },
        },
      },
    },
    dateTimeStrategy: {
      type: 'string',
      enum: ['date', 'coerce', 'isoString'],
      default: 'date',
      description:
        'How DateTime fields are represented: date (z.date()), coerce (z.coerce.date()), isoString (ISO string validated & transformed)',
    },
    addSelectType: {
      type: 'boolean',
      default: false,
      description: 'Legacy option: also generate Select type',
    },
    addIncludeType: {
      type: 'boolean',
      default: false,
      description: 'Legacy option: also generate Include type',
    },

    strictCreateInputs: {
      type: 'boolean',
      default: true,
      description:
        'When true, Create-like inputs bypass exclusions and strictly match Prisma types',
    },
    preserveRequiredScalarsOnCreate: {
      type: 'boolean',
      default: true,
      description:
        'When strictCreateInputs is false, keep required non-auto scalars in Create-like inputs even if excluded',
    },
    inferCreateArgsFromSchemas: {
      type: 'boolean',
      default: false,
      description:
        'When true, Args for create operations infer types from generated schemas instead of Prisma.*',
    },

    globalExclusions: {
      type: 'object',
      additionalProperties: false,
      description: 'Global field exclusions applied to all models',
      properties: {
        input: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
          },
          uniqueItems: true,
          description: 'Fields to exclude from input schemas globally',
        },
        result: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
          },
          uniqueItems: true,
          description: 'Fields to exclude from result schemas globally',
        },
        pure: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
          },
          uniqueItems: true,
          description: 'Fields to exclude from pure model schemas globally',
        },
      },
    },

    variants: {
      type: 'object',
      additionalProperties: false,
      description: 'Configuration for different schema variants',
      properties: {
        pure: {
          $ref: '#/definitions/variantConfig',
          description: 'Pure model schema variant configuration',
        },
        input: {
          $ref: '#/definitions/variantConfig',
          description: 'Input schema variant configuration',
        },
        result: {
          $ref: '#/definitions/variantConfig',
          description: 'Result schema variant configuration',
        },
      },
    },

    models: {
      type: 'object',
      additionalProperties: false,
      description: 'Per-model configuration options',
      patternProperties: {
        '^[A-Z][a-zA-Z0-9_]*$': {
          $ref: '#/definitions/modelConfig',
          description: 'Model-specific configuration (model names must be PascalCase)',
        },
      },
    },
  },

  definitions: {
    variantConfig: {
      type: 'object',
      additionalProperties: false,
      description: 'Configuration for a specific schema variant',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Whether this variant should be generated',
        },
        suffix: {
          type: 'string',
          minLength: 1,
          maxLength: 20,
          pattern: '^\\.[a-zA-Z][a-zA-Z0-9_]*$',
          description: 'File suffix for this variant (must start with a dot, e.g., ".model")',
        },
        excludeFields: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
            pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
          },
          uniqueItems: true,
          description: 'Fields to exclude from this variant',
        },
      },
    },

    modelConfig: {
      type: 'object',
      additionalProperties: false,
      description: 'Configuration for a specific Prisma model',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Whether schemas should be generated for this model',
        },
        operations: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'findMany',
              'findUnique',
              'findUniqueOrThrow',
              'findFirst',
              'findFirstOrThrow',
              'create',
              'createMany',
              'createManyAndReturn',
              'update',
              'updateMany',
              'updateManyAndReturn',
              'upsert',
              'delete',
              'deleteMany',
              'aggregate',
              'groupBy',
              'count',
            ],
          },
          uniqueItems: true,
          minItems: 1,
          description: 'Which operations to generate schemas for',
        },
        variants: {
          type: 'object',
          additionalProperties: false,
          description: 'Variant-specific configuration for this model',
          properties: {
            pure: {
              $ref: '#/definitions/variantConfig',
              description: 'Pure model variant configuration for this model',
            },
            input: {
              $ref: '#/definitions/variantConfig',
              description: 'Input variant configuration for this model',
            },
            result: {
              $ref: '#/definitions/variantConfig',
              description: 'Result variant configuration for this model',
            },
          },
        },
      },
    },
  },
};

/**
 * Schema for validating individual field names
 */
export const FieldNameSchema: JSONSchema7 = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
  description: 'Valid field name (alphanumeric with underscores, cannot start with number)',
};

/**
 * Schema for validating model names (PascalCase)
 */
export const ModelNameSchema: JSONSchema7 = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[A-Z][a-zA-Z0-9_]*$',
  description: 'Valid model name (PascalCase, alphanumeric with underscores)',
};

/**
 * Schema for validating output directory paths
 */
export const OutputPathSchema: JSONSchema7 = {
  type: 'string',
  minLength: 1,
  maxLength: 260, // Windows MAX_PATH limitation
  pattern: '^[^<>:"|?*\\x00-\\x1f]+$',
  description: 'Valid output directory path (no invalid filename characters)',
};

/**
 * Schema for validating file suffixes
 */
export const SuffixSchema: JSONSchema7 = {
  type: 'string',
  minLength: 2, // At least ".x"
  maxLength: 20,
  pattern: '^\\.[a-zA-Z][a-zA-Z0-9_]*$',
  description: 'Valid file suffix (must start with dot, followed by valid identifier)',
};

/**
 * Available Prisma operations that can be configured
 */
export const PRISMA_OPERATIONS = [
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
  'aggregate',
  'groupBy',
  'count',
] as const;

/**
 * Available generation modes
 */
export const GENERATION_MODES = ['full', 'minimal', 'custom'] as const;

/**
 * Available schema variants
 */
export const SCHEMA_VARIANTS = ['pure', 'input', 'result'] as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  mode: 'full',
  output: './generated',
  globalExclusions: {},
  variants: {
    pure: {
      enabled: true,
      suffix: '.model',
    },
    input: {
      enabled: true,
      suffix: '.input',
    },
    result: {
      enabled: true,
      suffix: '.result',
    },
  },
  models: {},
} as const;

/**
 * Minimal mode operation set
 */
export const MINIMAL_OPERATIONS = ['findMany', 'findUnique', 'create', 'update', 'delete'] as const;

/**
 * Configuration validation error types
 */
export enum ValidationErrorType {
  INVALID_JSON_SCHEMA = 'INVALID_JSON_SCHEMA',
  INVALID_FIELD_NAME = 'INVALID_FIELD_NAME',
  INVALID_MODEL_NAME = 'INVALID_MODEL_NAME',
  INVALID_OPERATION = 'INVALID_OPERATION',
  INVALID_MODE = 'INVALID_MODE',
  INVALID_VARIANT = 'INVALID_VARIANT',
  DUPLICATE_VALUES = 'DUPLICATE_VALUES',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
}

/**
 * Configuration validation error details
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  path: string;
  value?: unknown;
  allowedValues?: unknown[];
}

/**
 * Utility function to validate field names
 */
export function isValidFieldName(fieldName: string): boolean {
  return (
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName) && fieldName.length > 0 && fieldName.length <= 64
  );
}

/**
 * Utility function to validate model names (PascalCase)
 */
export function isValidModelName(modelName: string): boolean {
  return /^[A-Z][a-zA-Z0-9_]*$/.test(modelName) && modelName.length > 0 && modelName.length <= 64;
}

/**
 * Utility function to validate Prisma operations
 */
export function isValidOperation(operation: string): boolean {
  return PRISMA_OPERATIONS.includes(operation as (typeof PRISMA_OPERATIONS)[number]);
}

/**
 * Utility function to validate generation modes
 */
export function isValidMode(mode: string): boolean {
  return GENERATION_MODES.includes(mode as (typeof GENERATION_MODES)[number]);
}

/**
 * Utility function to validate schema variants
 */
export function isValidVariant(variant: string): boolean {
  return SCHEMA_VARIANTS.includes(variant as (typeof SCHEMA_VARIANTS)[number]);
}

/**
 * Utility function to validate file suffixes
 */
export function isValidSuffix(suffix: string): boolean {
  return /^\.[a-zA-Z][a-zA-Z0-9_]*$/.test(suffix) && suffix.length >= 2 && suffix.length <= 20;
}

/**
 * Get schema reference for a specific configuration section
 */
export function getSchemaSection(section: 'variantConfig' | 'modelConfig'): JSONSchema7 {
  return ConfigurationSchema.definitions?.[section] as JSONSchema7;
}

/**
 * Create a custom schema for validating specific parts of the configuration
 */
export function createPartialSchema(properties: string[]): JSONSchema7 {
  const baseSchema = { ...ConfigurationSchema };
  const filteredProperties: Record<string, JSONSchema7> = {};

  properties.forEach((prop) => {
    if (baseSchema.properties?.[prop]) {
      const propSchema = baseSchema.properties[prop];
      if (typeof propSchema === 'object') {
        filteredProperties[prop] = propSchema;
      }
    }
  });

  return {
    ...baseSchema,
    properties: filteredProperties,
    required: properties.filter((prop) => baseSchema.required?.includes(prop)),
  };
}
