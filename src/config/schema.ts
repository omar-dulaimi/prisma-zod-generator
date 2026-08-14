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
    $schema: {
      type: 'string',
      // No default. This carried 'http://json-schema.org/draft-07/schema#', which is the
      // JSON Schema *meta*-schema — a config that adopted it would be validated against
      // the grammar for writing schemas rather than against this one. The documented
      // value is a path to the installed copy, which is project-relative and so has no
      // sensible default (see website/docs/config/schema-json.md).
      description:
        'Path or URL to this schema, for editor completion. Typically ../node_modules/prisma-zod-generator/lib/config/schema.json relative to the config file.',
    },
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

    prismaClientPath: {
      type: 'string',
      minLength: 1,
      pattern: '^[^<>:"|?*\\x00-\\x1f]+$',
      description:
        "Override the Prisma Client import path generated schemas use, instead of deriving it from the schema's own generator client block. Relative paths resolve against the directory containing schema.prisma. Only needed when that derivation is wrong for an unusual setup - most projects never set this.",
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
      default: false,
      description:
        'When using array-based variants, place them at the schemas root. Default false: array variants are written under variants/ with a generated index.ts',
    },
    formatGeneratedSchemas: {
      type: 'boolean',
      default: false,
      description: 'Whether to run a formatter on generated schemas',
    },
    exportTypedSchemas: {
      type: 'boolean',
      default: true,
      description:
        'Whether to export the Prisma-typed schemas (e.g. UserFindManySchema, typed against Prisma.UserFindManyArgs)',
    },
    exportZodSchemas: {
      type: 'boolean',
      default: true,
      description:
        'Whether to export the plain Zod schemas alongside the typed ones (e.g. UserFindManyZodSchema)',
    },
    typedSchemaSuffix: {
      type: 'string',
      default: 'Schema',
      description: 'Suffix appended to the exported name of each Prisma-typed schema',
    },
    zodSchemaSuffix: {
      type: 'string',
      default: 'ZodSchema',
      description: 'Suffix appended to the exported name of each plain Zod schema',
    },
    minimalOperations: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Overrides which operations minimal mode emits. An escape hatch: unlike `models.*.operations` it applies globally and is not part of the per-model filtering contract.',
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
        schema: {
          type: 'object',
          additionalProperties: false,
          description: 'Overrides for CRUD operation schema file and symbol naming',
          properties: {
            filePattern: {
              type: 'string',
              minLength: 3,
              maxLength: 80,
              description:
                'Pattern for schema file names. Tokens: {Model}, {model}, {camel}, {kebab}. Must end with .ts',
              pattern: '.*\\.ts$',
            },
            exportNamePattern: {
              type: 'string',
              minLength: 0,
              maxLength: 80,
              description:
                'Pattern for schema export variable. Tokens: {Model}, {model}, {Operation}.',
            },
          },
        },
        input: {
          type: 'object',
          additionalProperties: false,
          description: 'Overrides for input object file and symbol naming',
          properties: {
            filePattern: {
              type: 'string',
              minLength: 3,
              maxLength: 80,
              description:
                'Pattern for input file names. Tokens: {Model}, {model}, {camel}, {kebab}, {InputType}. Must end with .ts',
              pattern: '.*\\.ts$',
            },
            exportNamePattern: {
              type: 'string',
              minLength: 0,
              maxLength: 80,
              description:
                'Pattern for input export variable. Tokens: {Model}, {model}, {InputType}.',
            },
          },
        },
        enum: {
          type: 'object',
          additionalProperties: false,
          description: 'Overrides for enum file and symbol naming',
          properties: {
            filePattern: {
              type: 'string',
              minLength: 3,
              maxLength: 80,
              description:
                'Pattern for enum file names. Tokens: {Enum}, {enum}, {camel}, {kebab}. Must end with .ts',
              pattern: '.*\\.ts$',
            },
            exportNamePattern: {
              type: 'string',
              minLength: 0,
              maxLength: 80,
              description: 'Pattern for enum export variable. Tokens: {Enum}, {enum}.',
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
    dateTimeSplitStrategy: {
      type: 'boolean',
      default: true,
      description:
        'When true and dateTimeStrategy is unset, use coerce for input schemas and date for pure/result schemas (split strategy)',
    },
    jsonSchemaCompatible: {
      type: 'boolean',
      default: false,
      description:
        'Generate schemas compatible with z.toJSONSchema() for API documentation. When enabled, overrides dateTimeStrategy and removes transforms. Trade-off: No runtime type conversion.',
    },
    jsonSchemaOptions: {
      type: 'object',
      properties: {
        dateTimeFormat: {
          type: 'string',
          enum: ['isoString', 'isoDate'],
          default: 'isoString',
          description: 'Format for DateTime fields in JSON Schema compatible mode',
        },
        bigIntFormat: {
          type: 'string',
          enum: ['string', 'number'],
          default: 'string',
          description: 'Format for BigInt fields in JSON Schema compatible mode',
        },
        bytesFormat: {
          type: 'string',
          enum: ['base64String', 'hexString'],
          default: 'base64String',
          description: 'Format for Bytes fields in JSON Schema compatible mode',
        },
        conversionOptions: {
          type: 'object',
          additionalProperties: false,
          properties: {
            unrepresentable: { type: 'string', enum: ['throw', 'any'], default: 'any' },
            cycles: { type: 'string', enum: ['ref', 'throw'], default: 'throw' },
            reused: { type: 'string', enum: ['inline', 'ref'], default: 'inline' },
          },
          description: 'Options forwarded to z.toJSONSchema()',
        },
      },
      additionalProperties: false,
      description: 'Options for JSON Schema compatibility mode',
    },
    typedJson: {
      type: 'object',
      properties: {
        schemaModule: {
          type: 'string',
          minLength: 1,
          description:
            "Module that [TypeName] resolves from: with './json-types', /// [WorkflowNode] uses WorkflowNodeSchema imported from there. A relative specifier is relative to the generator output directory.",
        },
        schemaSuffix: {
          type: 'string',
          minLength: 0,
          default: 'Schema',
          description: 'Suffix appended to the annotation type name. [Foo] -> FooSchema.',
        },
        namespace: {
          type: 'string',
          pattern: '^[A-Za-z_$][A-Za-z0-9_$]*$',
          default: 'PrismaJson',
          description:
            'Namespace the emitted declare global block declares. Matches prisma-json-types-generator.',
        },
        applyToResults: {
          type: 'boolean',
          default: false,
          description:
            'Also apply the annotation to schemas/results/*. Off by default: result schemas are emitted by default and describe rows the database already returned, so typing them would make a row written before the annotation existed throw on READ. Turn it on to make the read path agree with the write path.',
        },
        emitNamespace: {
          type: 'boolean',
          default: false,
          description:
            'Emit a declare global file deriving the namespace types from the Zod schemas, so the schema is the single authored definition.',
        },
        namespaceOutput: {
          type: 'string',
          minLength: 1,
          default: './prisma-json-types.d.ts',
          description:
            'Path of the emitted namespace file, relative to the generator output directory.',
        },
        map: {
          type: 'object',
          propertyNames: { pattern: '^[A-Za-z_$][A-Za-z0-9_$]*$' },
          additionalProperties: { type: 'string', minLength: 1 },
          description:
            'Explicit TypeName -> Zod expression overrides, checked before schemaModule.',
        },
      },
      additionalProperties: false,
      description:
        "Read prisma-json-types-generator's /// [TypeName] and /// ![<ts type>] annotations and validate those fields at runtime. Unrelated to jsonSchemaCompatible / jsonSchemaOptions. Omit for byte-identical output.",
    },
    addSelectType: {
      type: 'boolean',
      default: true,
      description:
        'Generate Select schemas. On by default; set false to omit them. Forced off in minimal mode. Generator-block equivalent: isGenerateSelect',
    },
    addIncludeType: {
      type: 'boolean',
      default: true,
      description:
        'Generate Include schemas. On by default; set false to omit them. Forced off in minimal mode. Generator-block equivalent: isGenerateInclude',
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
        'Reserved, currently no effect. Intended to let create-operation Args infer types from the generated schemas instead of Prisma.*; the generation pipeline does not read it yet. Create-input shape is controlled by strictCreateInputs and preserveRequiredScalarsOnCreate.',
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
          description: 'Operations to exclude globally from all models',
        },
      },
    },

    // Both documented forms. The array form of custom variants was previously absent, so
    // a config using it was rejected with "must be object" even though generation
    // succeeds — one of the gaps listed on the JSON Schema IntelliSense docs page.
    variants: {
      description:
        'Configuration for schema variants: either the built-in pure/input/result object form, or an array of custom variants',
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          description: 'Built-in variants',
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
        {
          type: 'array',
          description: 'Custom variants, one object per emitted variant',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name'],
            properties: {
              name: { type: 'string', description: 'Variant name, used in the emitted file name' },
              suffix: {
                type: 'string',
                description: 'Suffix for the emitted file and exported schema name',
              },
              exclude: {
                type: 'array',
                items: { type: 'string' },
                description: 'Field names to omit from this variant',
              },
              additionalValidation: {
                type: 'object',
                additionalProperties: { type: 'string' },
                description: 'Extra Zod chained calls per field name',
              },
              makeOptional: {
                type: 'array',
                items: { type: 'string' },
                description: 'Field names to mark optional in this variant',
              },
              transformRequiredToOptional: {
                type: 'array',
                items: { type: 'string' },
                description: 'Required field names to turn optional',
              },
              transformOptionalToRequired: {
                type: 'boolean',
                description: 'Turn every optional field required in this variant',
              },
              removeValidation: {
                type: 'boolean',
                description: 'Drop field-level validation rules in this variant',
              },
            },
          },
        },
      ],
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

    zodImportTarget: {
      type: 'string',
      enum: ['auto', 'v3', 'v4'],
      default: 'auto',
      description:
        "How to import Zod in generated code: 'auto' uses import * as z from 'zod'; 'v3' uses import { z } from 'zod'; 'v4' uses import * as z from 'zod/v4'",
    },

    zodImportPath: {
      type: 'string',
      description:
        "Custom module path to import z from instead of 'zod' (e.g. './lib/zod' re-exporting a configured Zod instance with an i18n error map). The binding style still follows zodImportTarget, so the module must export z to match.",
    },

    optionalFieldBehavior: {
      type: 'string',
      enum: ['optional', 'nullable', 'nullish'],
      default: 'nullish',
      description:
        'How schema-optional fields are wrapped in pure model schemas: optional() (undefined), nullable() (null) or nullish() (both).',
    },

    decimalMode: {
      type: 'string',
      enum: ['number', 'string', 'decimal'],
      default: 'decimal',
      description:
        "How Decimal fields are represented: 'decimal' validates Prisma.Decimal instances via helpers, 'number' uses z.number(), 'string' uses z.string().",
    },

    emit: {
      type: 'object',
      additionalProperties: false,
      description:
        'Per-artifact emission switches. Each defaults to the legacy gating for that artifact (see docs: Emission Controls).',
      properties: {
        enums: { type: 'boolean', description: 'Emit enum schemas (enums/). Default true.' },
        objects: {
          type: 'boolean',
          description: 'Emit object/input schemas (objects/). Default true unless suppressed.',
        },
        crud: {
          type: 'boolean',
          description: 'Emit CRUD operation argument schemas. Default true unless suppressed.',
        },
        results: { type: 'boolean', description: 'Emit result schemas (results/).' },
        pureModels: {
          type: 'boolean',
          description: 'Emit pure model schemas (models/). Mirrors pureModels when unspecified.',
        },
        variants: {
          type: 'boolean',
          description:
            'Emit variant wrapper schemas (variants/). Default true if any variant is enabled.',
        },
      },
    },

    safety: {
      type: 'object',
      additionalProperties: false,
      description:
        'Output-path safety system that prevents the generator from deleting user code (see docs: Safety System).',
      properties: {
        level: {
          type: 'string',
          enum: ['strict', 'standard', 'permissive'],
          default: 'standard',
          description: 'Safety preset: strict blocks warned paths, permissive only warns.',
        },
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Master switch for all safety checks.',
        },
        allowDangerousPaths: {
          type: 'boolean',
          default: false,
          description: 'Allow generating into directories with risky names (src, lib, ...).',
        },
        allowProjectRoots: {
          type: 'boolean',
          default: false,
          description: 'Allow generating into a directory that looks like a project root.',
        },
        allowUserFiles: {
          type: 'boolean',
          default: false,
          description:
            'Allow cleanup when the output directory contains files that may be user code.',
        },
        skipManifest: {
          type: 'boolean',
          default: false,
          description: 'Skip writing/reading the generation manifest (disables tracked cleanup).',
        },
        warningsOnly: {
          type: 'boolean',
          default: false,
          description: 'Downgrade blocking safety errors to warnings.',
        },
        customDangerousPaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional directory names treated as dangerous.',
        },
        customProjectFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional file names that mark a directory as a project root.',
        },
        maxUserFiles: {
          type: 'number',
          description: 'Maximum number of possible user files tolerated before blocking cleanup.',
        },
      },
    },

    validateWhereUniqueAtLeastOne: {
      type: 'boolean',
      default: false,
      description:
        'Opt-in: add a minimal Zod superRefine to WhereUniqueInput schemas requiring at least one top-level unique selector to be present. Disabled by default.',
    },

    strictMode: {
      type: 'object',
      additionalProperties: false,
      description: 'Global strict mode configuration for generated Zod schemas',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Global default for strict mode on all schemas (backward compatibility)',
        },
        operations: {
          type: 'boolean',
          default: true,
          description: 'Apply strict mode to operation schemas (findMany, create, etc.)',
        },
        objects: {
          type: 'boolean',
          default: true,
          description: 'Apply strict mode to object schemas (WhereInput, CreateInput, etc.)',
        },
        variants: {
          type: 'boolean',
          default: true,
          description: 'Apply strict mode to variant schemas (pure, input, result)',
        },
        enums: {
          type: 'boolean',
          default: true,
          description:
            'No effect. Enum schemas are emitted as z.enum(...), which has no strict() to apply. Accepted for backward compatibility',
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
        partial: {
          type: 'boolean',
          default: false,
          description: 'Apply .partial() to the generated schema, making all fields optional',
        },
        strictMode: {
          type: ['boolean', 'null'],
          description: 'Override strict mode for this variant (null uses global/parent setting)',
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
        strictMode: {
          type: 'object',
          additionalProperties: false,
          description: 'Strict mode configuration for this model',
          properties: {
            enabled: {
              type: ['boolean', 'null'],
              description: 'Override global strict mode for this model (null uses global setting)',
            },
            operations: {
              oneOf: [
                { type: 'boolean' },
                {
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
                },
                { type: 'null' },
              ],
              description:
                'Control strict mode for specific operations (boolean for all, array for specific, null for global)',
            },
            exclude: {
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
              description: 'Operations to exclude from strict mode',
            },
            objects: {
              type: ['boolean', 'null'],
              description:
                'Override strict mode for object schemas of this model (null uses global setting)',
            },
            variants: {
              type: 'object',
              additionalProperties: false,
              description: 'Per-variant strict mode overrides for this model',
              properties: {
                pure: {
                  type: ['boolean', 'null'],
                  description: 'Override strict mode for pure variant of this model',
                },
                input: {
                  type: ['boolean', 'null'],
                  description: 'Override strict mode for input variant of this model',
                },
                result: {
                  type: ['boolean', 'null'],
                  description: 'Override strict mode for result variant of this model',
                },
              },
            },
          },
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
export const MINIMAL_OPERATIONS = [
  'findMany',
  'findUnique',
  'findFirst',
  'create',
  'update',
  'delete',
] as const;

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
 * Utility function to validate Prisma operations
 */
export function isValidOperation(operation: string): boolean {
  return PRISMA_OPERATIONS.includes(operation as (typeof PRISMA_OPERATIONS)[number]);
}

/**
 * Utility function to validate schema variants
 */
export function isValidVariant(variant: string): boolean {
  return SCHEMA_VARIANTS.includes(variant as (typeof SCHEMA_VARIANTS)[number]);
}
