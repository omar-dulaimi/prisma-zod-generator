/**
 * Result Schema Generator
 * Generates Zod schemas for Prisma operation return values to enable validation of API responses and operation results
 */

import { DMMF } from '@prisma/generator-helper';
import { GeneratorConfig } from '../config/parser';
import { getDefaultConfiguration } from '../config/defaults';

/**
 * Prisma operation types that return results
 */
export enum OperationType {
  FIND_UNIQUE = 'findUnique',
  FIND_FIRST = 'findFirst',
  FIND_MANY = 'findMany',
  CREATE = 'create',
  CREATE_MANY = 'createMany',
  UPDATE = 'update',
  UPDATE_MANY = 'updateMany',
  UPSERT = 'upsert',
  DELETE = 'delete',
  DELETE_MANY = 'deleteMany',
  AGGREGATE = 'aggregate',
  GROUP_BY = 'groupBy',
  COUNT = 'count',
}

/**
 * Result schema generation options
 */
export interface ResultSchemaOptions {
  modelName: string;
  operationType: OperationType;
  includeRelations?: string[];
  excludeFields?: string[];
  paginationSupport?: boolean;
  nullableResult?: boolean;
  customValidations?: Record<string, string>;
}

/**
 * Pagination schema configuration
 */
export interface PaginationConfig {
  includeCursor?: boolean;
  includeCount?: boolean;
  includePageInfo?: boolean;
  customFields?: Record<string, string>;
}

/**
 * Aggregate operation configuration
 */
export interface AggregateConfig {
  includeCount?: boolean;
  includeSum?: string[];
  includeAvg?: string[];
  includeMin?: string[];
  includeMax?: string[];
  customAggregates?: Record<string, string>;
}

/**
 * Reference to a pure model schema that a result schema depends on.
 * `exportName` is the exported identifier (e.g. `TagSchema`) and `fileBase`
 * is the model file name without its `.ts` extension (e.g. `Tag.schema`).
 */
export interface ResultModelSchemaRef {
  exportName: string;
  fileBase: string;
}

/**
 * Generated result schema information
 */
export interface GeneratedResultSchema {
  operationType: OperationType;
  schemaName: string;
  zodSchema: string;
  typeDefinition: string;
  imports: Set<string>;
  exports: Set<string>;
  dependencies: string[];
  /**
   * Pure model schemas (by Prisma model name) referenced by relation fields in
   * this result schema. The transformer turns these into `../models/*` imports.
   * Separate from `dependencies` (which routes through `../objects`).
   */
  modelDependencies: string[];
  documentation: string;
  examples?: string[];
}

/**
 * Result schema generation context
 */
export interface ResultGenerationContext {
  model: DMMF.Model;
  options: ResultSchemaOptions;
  baseModelSchema?: string;
}

/**
 * Result Schema Generator
 * Main class for generating Zod schemas for Prisma operation results
 */
export class ResultSchemaGenerator {
  private generatedSchemas: Map<string, GeneratedResultSchema> = new Map();
  private baseModelSchemas: Map<string, string> = new Map();
  private config: GeneratorConfig;
  /**
   * Pure model schemas that are known to be emitted and safe to reference from
   * result schemas, keyed by Prisma model name. Populated by the transformer via
   * {@link setAvailablePureModels}. When a relation's target model is present
   * here, the relation field references its `<Model>Schema`; otherwise it falls
   * back to `z.unknown()`. Empty in single-file mode (references cannot resolve
   * across the inlined bundle) so relations degrade to the safe fallback.
   */
  private availablePureModels: Map<string, ResultModelSchemaRef> = new Map();
  // Safe accessors for JSON Schema compatibility flags/options to avoid strict type coupling
  private isJsonSchemaModeEnabled(): boolean {
    const cfg = this.config as unknown as { jsonSchemaCompatible?: boolean };
    return !!cfg?.jsonSchemaCompatible;
  }

  /**
   * Zod expression for a Decimal field in a result schema, honoring decimalMode.
   *
   * Result schemas validate what Prisma *returns*, and in the default 'decimal'
   * mode that is a Prisma.Decimal instance — so a plain z.number() would reject
   * real query results. The 'decimal' expression is deliberately import-free
   * (structural check on the decimal.js shape) so result files stay
   * dependency-free and keep working in single-file bundles; it also matches
   * Decimal instances coming from a different runtime copy of the class.
   *
   * It remains a union with number and numeric string so that callers already
   * parsing serialized results (which previously validated against z.number())
   * keep working — the change only adds the Decimal shape that used to be
   * rejected.
   */
  private decimalResultExpression(): string {
    // JSON Schema compatibility mode targets plain JSON, where Decimal has no
    // representation beyond a number.
    if (this.isJsonSchemaModeEnabled()) return 'z.number()';

    const mode = (this.config as unknown as { decimalMode?: string })?.decimalMode ?? 'decimal';
    if (mode === 'number') return 'z.number()';
    if (mode === 'string') return 'z.string()';
    return (
      'z.union([z.number(), z.string().regex(/^-?\\d+(\\.\\d+)?$/), ' +
      "z.custom((v) => v !== null && typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && typeof (v as { toFixed?: unknown }).toFixed === 'function', { message: 'Expected a Prisma.Decimal' })])"
    );
  }

  private getJsonSchemaOptions(): {
    dateTimeFormat?: 'isoString' | 'isoDate';
    bigIntFormat?: 'string' | 'number';
    bytesFormat?: 'base64String' | 'hexString';
  } {
    const cfg = this.config as unknown as {
      jsonSchemaOptions?: {
        dateTimeFormat?: 'isoString' | 'isoDate';
        bigIntFormat?: 'string' | 'number';
        bytesFormat?: 'base64String' | 'hexString';
      };
    };
    return (cfg?.jsonSchemaOptions ?? {}) as {
      dateTimeFormat?: 'isoString' | 'isoDate';
      bigIntFormat?: 'string' | 'number';
      bytesFormat?: 'base64String' | 'hexString';
    };
  }

  constructor(config?: GeneratorConfig) {
    this.config = config ?? getDefaultConfiguration();
  }

  /**
   * Register the set of pure model schemas that are emitted and safe to
   * reference from generated result schemas. Called by the transformer, which
   * owns knowledge of model enablement, the pure-model emission predicate and
   * the pure-model naming resolver. Passing an empty map (the single-file case)
   * makes every relation field fall back to `z.unknown()`.
   */
  setAvailablePureModels(models: Map<string, ResultModelSchemaRef>): void {
    this.availablePureModels = models;
    // Cached schemas were built against the previous mapping; invalidate them.
    this.generatedSchemas.clear();
  }

  /**
   * Generate result schema for a specific operation
   */
  generateResultSchema(model: DMMF.Model, options: ResultSchemaOptions): GeneratedResultSchema {
    const context = this.buildGenerationContext(model, options);
    const cacheKey = this.generateCacheKey(options);

    // Check cache first
    if (this.generatedSchemas.has(cacheKey)) {
      const cachedSchema = this.generatedSchemas.get(cacheKey);
      if (cachedSchema) {
        return cachedSchema;
      }
    }

    let result: GeneratedResultSchema;

    switch (options.operationType) {
      case OperationType.FIND_UNIQUE:
      case OperationType.FIND_FIRST:
      case OperationType.CREATE:
      case OperationType.UPDATE:
      case OperationType.UPSERT:
      case OperationType.DELETE:
        result = this.generateSingleResultSchema(context);
        break;

      case OperationType.FIND_MANY:
        result = this.generateArrayResultSchema(context);
        break;

      case OperationType.CREATE_MANY:
      case OperationType.UPDATE_MANY:
      case OperationType.DELETE_MANY:
        result = this.generateBatchResultSchema(context);
        break;

      case OperationType.AGGREGATE:
        result = this.generateAggregateResultSchema(context);
        break;

      case OperationType.GROUP_BY:
        result = this.generateGroupByResultSchema(context);
        break;

      case OperationType.COUNT:
        result = this.generateCountResultSchema(context);
        break;

      default:
        throw new Error(`Unsupported operation type: ${options.operationType}`);
    }

    // Cache the result
    this.generatedSchemas.set(cacheKey, result);
    return result;
  }

  /**
   * Generate schemas for all operations of a model
   */
  generateAllResultSchemas(
    model: DMMF.Model,
    operationTypes: OperationType[] = Object.values(OperationType),
  ): GeneratedResultSchema[] {
    const results: GeneratedResultSchema[] = [];

    operationTypes.forEach((operationType) => {
      const options: ResultSchemaOptions = {
        modelName: model.name,
        operationType,
        paginationSupport: operationType === OperationType.FIND_MANY,
        nullableResult: this.isNullableOperation(operationType),
      };

      try {
        const result = this.generateResultSchema(model, options);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to generate ${operationType} result schema for ${model.name}:`, error);
      }
    });

    return results;
  }

  /**
   * Build generation context
   */
  private buildGenerationContext(
    model: DMMF.Model,
    options: ResultSchemaOptions,
  ): ResultGenerationContext {
    // This used to also build a `fieldTypeMap` and a `relatedModels` map, the latter from
    // fabricated `DMMF.Model` objects with empty `fields` — carrying the comment "In a real
    // implementation, you'd get this from the DMMF. For now, we'll create a placeholder".
    // Neither map was ever read: they were attached to the context and nothing consumed
    // them. The field types that do reach the output come from mapPrismaTypeToZod at the
    // point of emission, which reads the real field.
    return {
      model,
      options,
      baseModelSchema: this.getBaseModelSchema(model),
    };
  }

  /**
   * Generate single result schema (for operations returning one model or null)
   */
  private generateSingleResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { options } = context;
    const schemaName = this.generateSchemaName(options);
    const modelDependencies = new Set<string>();
    const baseSchema = this.buildBaseResultSchema(context, modelDependencies);

    let zodSchema: string;
    let typeDefinition: string;

    if (options.nullableResult || this.isNullableOperation(options.operationType)) {
      zodSchema = `z.nullable(${baseSchema})`;
      typeDefinition = `z.infer<typeof ${schemaName}> | null`;
    } else {
      zodSchema = baseSchema;
      typeDefinition = `z.infer<typeof ${schemaName}>`;
    }

    const documentation = this.generateDocumentation(options, 'Single model result');
    const examples = this.generateExamples(context, 'single');

    return {
      operationType: options.operationType,
      schemaName,
      zodSchema: `export const ${schemaName} = ${zodSchema};`,
      typeDefinition: `export type ${schemaName}Type = ${typeDefinition};`,
      imports: new Set(['z']),
      exports: new Set([schemaName, `${schemaName}Type`]),
      dependencies: this.extractDependencies(context),
      modelDependencies: Array.from(modelDependencies),
      documentation,
      examples,
    };
  }

  /**
   * Generate array result schema (for findMany operations)
   */
  private generateArrayResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { options } = context;
    const schemaName = this.generateSchemaName(options);
    const modelDependencies = new Set<string>();
    const baseSchema = this.buildBaseResultSchema(context, modelDependencies);

    let zodSchema: string;
    let typeDefinition: string;

    if (options.paginationSupport) {
      const paginationSchema = this.generatePaginationSchema();
      zodSchema = `z.object({\n  data: z.array(${baseSchema}),\n  pagination: ${paginationSchema}\n})`;
      typeDefinition = `z.infer<typeof ${schemaName}>`;
    } else {
      zodSchema = `z.array(${baseSchema})`;
      typeDefinition = `z.infer<typeof ${schemaName}>`;
    }

    const documentation = this.generateDocumentation(options, 'Array of model results');
    const examples = this.generateExamples(context, 'array');

    return {
      operationType: options.operationType,
      schemaName,
      zodSchema: `export const ${schemaName} = ${zodSchema};`,
      typeDefinition: `export type ${schemaName}Type = ${typeDefinition};`,
      imports: new Set(['z']),
      exports: new Set([schemaName, `${schemaName}Type`]),
      dependencies: this.extractDependencies(context),
      modelDependencies: Array.from(modelDependencies),
      documentation,
      examples,
    };
  }

  /**
   * Generate batch operation result schema
   */
  private generateBatchResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { options } = context;
    const schemaName = this.generateSchemaName(options);

    const zodSchema = `z.object({
  count: z.number()
})`;

    const documentation = this.generateDocumentation(options, 'Batch operation result');
    const examples = this.generateExamples(context, 'batch');

    return {
      operationType: options.operationType,
      schemaName,
      zodSchema: `export const ${schemaName} = ${zodSchema};`,
      typeDefinition: `export type ${schemaName}Type = z.infer<typeof ${schemaName}>;`,
      imports: new Set(['z']),
      exports: new Set([schemaName, `${schemaName}Type`]),
      dependencies: [],
      modelDependencies: [],
      documentation,
      examples,
    };
  }

  /**
   * Generate aggregate result schema
   */
  private generateAggregateResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { model, options } = context;
    const schemaName = this.generateSchemaName(options);

    const aggregateFields = this.buildAggregateFields(model);
    const zodSchema = `z.object({${aggregateFields}})`;

    const documentation = this.generateDocumentation(options, 'Aggregate operation result');
    const examples = this.generateExamples(context, 'aggregate');

    return {
      operationType: options.operationType,
      schemaName,
      zodSchema: `export const ${schemaName} = ${zodSchema};`,
      typeDefinition: `export type ${schemaName}Type = z.infer<typeof ${schemaName}>;`,
      imports: new Set(['z']),
      exports: new Set([schemaName, `${schemaName}Type`]),
      dependencies: [],
      modelDependencies: [],
      documentation,
      examples,
    };
  }

  /**
   * Generate groupBy result schema
   */
  private generateGroupByResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { model, options } = context;
    const schemaName = this.generateSchemaName(options);

    const groupByFields = this.buildGroupByFields(model);
    const aggregateFields = this.buildAggregateFields(model);

    const allFields = [groupByFields, aggregateFields].filter((fields) => fields.trim().length > 0);
    const zodSchema = `z.array(z.object({
${allFields.join(',\n')}
}))`;

    const documentation = this.generateDocumentation(options, 'GroupBy operation result');
    const examples = this.generateExamples(context, 'groupBy');

    return {
      operationType: options.operationType,
      schemaName,
      zodSchema: `export const ${schemaName} = ${zodSchema};`,
      typeDefinition: `export type ${schemaName}Type = z.infer<typeof ${schemaName}>;`,
      imports: new Set(['z']),
      exports: new Set([schemaName, `${schemaName}Type`]),
      dependencies: [],
      modelDependencies: [],
      documentation,
      examples,
    };
  }

  /**
   * Generate count result schema
   */
  private generateCountResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { options } = context;
    const schemaName = this.generateSchemaName(options);

    // Simple count should be a number schema
    const zodSchema: string = 'z.number()';

    const documentation = this.generateDocumentation(options, 'Count operation result');
    const examples = this.generateExamples(context, 'count');

    return {
      operationType: options.operationType,
      schemaName,
      zodSchema: `export const ${schemaName} = ${zodSchema};`,
      typeDefinition: `export type ${schemaName}Type = z.infer<typeof ${schemaName}>;`,
      imports: new Set(['z']),
      exports: new Set([schemaName, `${schemaName}Type`]),
      dependencies: [],
      modelDependencies: [],
      documentation,
      examples,
    };
  }

  /**
   * Helper methods
   */

  private generateSchemaName(options: ResultSchemaOptions): string {
    const operationSuffix = this.operationTypeToSuffix(options.operationType);
    return `${options.modelName}${operationSuffix}ResultSchema`;
  }

  private operationTypeToSuffix(operationType: OperationType): string {
    const suffixMap: Record<OperationType, string> = {
      [OperationType.FIND_UNIQUE]: 'FindUnique',
      [OperationType.FIND_FIRST]: 'FindFirst',
      [OperationType.FIND_MANY]: 'FindMany',
      [OperationType.CREATE]: 'Create',
      [OperationType.CREATE_MANY]: 'CreateMany',
      [OperationType.UPDATE]: 'Update',
      [OperationType.UPDATE_MANY]: 'UpdateMany',
      [OperationType.UPSERT]: 'Upsert',
      [OperationType.DELETE]: 'Delete',
      [OperationType.DELETE_MANY]: 'DeleteMany',
      [OperationType.AGGREGATE]: 'Aggregate',
      [OperationType.GROUP_BY]: 'GroupBy',
      [OperationType.COUNT]: 'Count',
    };
    return suffixMap[operationType];
  }

  private isNullableOperation(operationType: OperationType): boolean {
    return [
      OperationType.FIND_UNIQUE,
      OperationType.FIND_FIRST,
      OperationType.UPDATE,
      OperationType.DELETE,
    ].includes(operationType);
  }

  private buildBaseResultSchema(
    context: ResultGenerationContext,
    modelDependencies: Set<string> = new Set<string>(),
  ): string {
    const { model, options } = context;

    // Start with base model schema
    const fields = model.fields.filter((field) => {
      if (options.excludeFields?.includes(field.name)) return false;
      return true;
    });

    const fieldSchemas = fields.map((field) => {
      // Relation (object) fields cannot be expressed by the scalar type map.
      // When the related model's pure schema is emitted we reference it directly
      // (e.g. `z.array(TagSchema).optional()`); otherwise we fall back to
      // `z.unknown()`. Relations are always optional because they only appear in
      // a result when the query explicitly `include`s them.
      if (field.kind === 'object') {
        return `  ${field.name}: ${this.buildRelationFieldSchema(field, model, modelDependencies)}`;
      }
      const zodType = this.mapPrismaTypeToZod(field);
      const optionalMarker = !field.isRequired ? '.optional()' : '';
      return `  ${field.name}: ${zodType}${optionalMarker}`;
    });

    // Add included relations
    if (options.includeRelations) {
      options.includeRelations.forEach((relationName) => {
        const relationField = model.fields.find((f) => f.name === relationName);
        if (relationField) {
          const relationSchema = this.buildRelationSchema(relationField);
          fieldSchemas.push(`  ${relationName}: ${relationSchema}`);
        }
      });
    }

    const baseSchemaStr = `z.object({\n${fieldSchemas.join(',\n')}\n})`;
    return baseSchemaStr;
  }

  /**
   * Build the Zod expression for a relation (object) field in a record-shaped
   * result schema. References the related model's pure schema when it is emitted
   * and safe to import; otherwise falls back to `z.unknown()`. Always optional
   * because relations are only present when the query `include`s them.
   *
   * Self-relations (target model === current model) use the fallback so the
   * result file never has to import a schema for a cyclic/self reference,
   * mirroring the existing guard in {@link extractDependencies}.
   */
  private buildRelationFieldSchema(
    field: DMMF.Field,
    model: DMMF.Model,
    modelDependencies: Set<string>,
  ): string {
    const isSelfRelation = field.type === model.name;
    const modelRef = isSelfRelation ? undefined : this.availablePureModels.get(field.type);

    let inner: string;
    if (modelRef) {
      inner = modelRef.exportName;
      modelDependencies.add(field.type);
    } else {
      // Fallback: related pure model schema is not generated, this is a
      // self-relation, or we are in single-file mode.
      inner = this.isJsonSchemaModeEnabled() ? 'z.any()' : 'z.unknown()';
    }

    const base = field.isList ? `z.array(${inner})` : inner;
    return `${base}.optional()`;
  }

  private buildRelationSchema(field: DMMF.Field): string {
    if (field.isList) {
      return `z.array(z.object({ /* ${field.type} fields */ }))`;
    }
    return `z.object({ /* ${field.type} fields */ }).optional()`;
  }

  /**
   * The `_count` / `_sum` / `_avg` / `_min` / `_max` slots of an aggregate result.
   *
   * Membership and optionality both follow Prisma, measured from the DMMF for a model
   * carrying every scalar type, a list of each, an enum and a relation:
   *
   *   Count -> every scalar including lists, no relations, plus `_all`
   *   Min   -> non-list scalars and enums, plus Boolean, Bytes and DateTime; no Json
   *   Max   -> same as Min
   *   Sum   -> numeric columns including lists, and a list column sums to an ARRAY
   *   Avg   -> numeric columns including lists, always a single number (Decimal stays Decimal)
   *
   * Every member is `.optional()`, which is the part that was actually breaking reads.
   * An aggregate selects its members: `aggregate({ _count: { id: true } })` returns
   * `_count: { id: 3 }` and nothing else, so a required member rejects the real response.
   * Emitting relation counts and list columns in `_min` made that certain rather than
   * merely likely, since Prisma can never supply them.
   */
  private buildAggregateFields(model: DMMF.Model): string {
    const isNumeric = (f: DMMF.Field) => ['Int', 'Float', 'Decimal', 'BigInt'].includes(f.type);
    const numericFields = model.fields.filter((f) => f.kind !== 'object' && isNumeric(f));

    // Relations are counted through `_count` on the record, never in the aggregate's
    // `_count`, so including them rejected every real response for a model with a relation.
    const countableFields = model.fields.filter((field) => field.kind !== 'object');
    const countObjectFields = [
      ...countableFields.map((field) => `    ${field.name}: z.number().optional()`),
      '    _all: z.number().optional()',
    ];
    // `aggregate({ _count: true })` answers with a bare number, and only
    // `_count: { id: true }` answers with the object. Our own args schema already emits
    // `_count: z.union([z.literal(true), <CountAggregateInput>])`, so accepting only the
    // object here made the result schema reject a response the request schema had just
    // allowed the caller to ask for.
    const aggregateFields: string[] = [
      `  _count: z.union([z.number(), z.object({\n${countObjectFields.join(',\n')}\n  })]).optional()`,
    ];

    if (numericFields.length > 0) {
      // Summing a list column yields a list: `ratios Float[]` sums to `Float[]`.
      const sumFields = numericFields.map((field) => {
        const scalar = field.type === 'BigInt' ? 'z.bigint()' : 'z.number()';
        const expression = field.isList ? `z.array(${scalar})` : scalar;
        return `    ${field.name}: ${expression}.nullable().optional()`;
      });
      aggregateFields.push(
        `  _sum: z.object({\n${sumFields.join(',\n')}\n  }).nullable().optional()`,
      );

      // An average is a single number even for a list column, and Decimal stays Decimal.
      const avgFields = numericFields.map((field) => {
        const expression = field.type === 'Decimal' ? this.decimalResultExpression() : 'z.number()';
        return `    ${field.name}: ${expression}.nullable().optional()`;
      });
      aggregateFields.push(
        `  _avg: z.object({\n${avgFields.join(',\n')}\n  }).nullable().optional()`,
      );
    }

    // Prisma takes a min/max of anything orderable, which is every scalar and enum except
    // Json, and never a list. The previous list was narrower in one direction (no Boolean,
    // Bytes or enum) and wider in the other (list columns), so it both dropped members
    // Prisma returns and demanded members it does not.
    const comparableFields = model.fields.filter(
      (field) => field.kind !== 'object' && !field.isList && field.type !== 'Json',
    );

    if (comparableFields.length > 0) {
      // `_min` and `_max` are the only aggregate slots holding a column *value*, so they
      // are the only ones an annotation may narrow. `_count` is a row count and
      // `_sum` / `_avg` are arithmetic over the group; all three stay numeric whatever
      // the column holds.
      const minMaxFields = comparableFields.map((field) => {
        const zodType = this.mapPrismaTypeToZod(field);
        return `    ${field.name}: ${zodType}.nullable().optional()`;
      });
      aggregateFields.push(
        `  _min: z.object({\n${minMaxFields.join(',\n')}\n  }).nullable().optional()`,
      );
      aggregateFields.push(
        `  _max: z.object({\n${minMaxFields.join(',\n')}\n  }).nullable().optional()`,
      );
    }

    return aggregateFields.join(',\n');
  }

  private buildGroupByFields(model: DMMF.Model): string {
    // For groupBy, we include the actual field values that can be grouped by
    // Arrays can be grouped by in databases like PostgreSQL, so include them
    const groupableFields = model.fields.filter((f) => f.kind === 'scalar');

    return groupableFields
      .map((field) => {
        const zodType = this.mapPrismaTypeToZod(field);
        return `  ${field.name}: ${zodType}`;
      })
      .join(',\n');
  }

  private generatePaginationSchema(): string {
    return `z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})`;
  }

  private mapPrismaTypeToZod(field: DMMF.Field): string {
    const isJsonSchemaCompatible = this.isJsonSchemaModeEnabled();

    // Handle JSON Schema compatibility mapping
    if (isJsonSchemaCompatible) {
      switch (field.type) {
        case 'DateTime':
          const { dateTimeFormat } = this.getJsonSchemaOptions();
          const dtFormat = dateTimeFormat || 'isoString';
          if (dtFormat === 'isoDate') {
            return field.isList
              ? 'z.array(z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Invalid ISO date"))'
              : 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Invalid ISO date")';
          } else {
            return field.isList
              ? 'z.array(z.string().regex(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/, "Invalid ISO datetime"))'
              : 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/, "Invalid ISO datetime")';
          }
        case 'BigInt':
          const { bigIntFormat } = this.getJsonSchemaOptions();
          const biFormat = bigIntFormat || 'string';
          if (biFormat === 'string') {
            return field.isList
              ? 'z.array(z.string().regex(/^\\d+$/, "Invalid bigint string"))'
              : 'z.string().regex(/^\\d+$/, "Invalid bigint string")';
          } else {
            return field.isList ? 'z.array(z.number().int())' : 'z.number().int()';
          }
        case 'Bytes':
          const { bytesFormat } = this.getJsonSchemaOptions();
          const bFormat = bytesFormat || 'base64String';
          if (bFormat === 'base64String') {
            return field.isList
              ? 'z.array(z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid base64 string"))'
              : 'z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid base64 string")';
          } else {
            return field.isList
              ? 'z.array(z.string().regex(/^[0-9a-fA-F]*$/, "Invalid hex string"))'
              : 'z.string().regex(/^[0-9a-fA-F]*$/, "Invalid hex string")';
          }
      }
    }

    const typeMap: Record<string, string> = {
      String: 'z.string()',
      Int: 'z.number().int()',
      Float: 'z.number()',
      Boolean: 'z.boolean()',
      DateTime: 'z.date()',
      Json: isJsonSchemaCompatible ? 'z.any()' : 'z.unknown()',
      Bytes: 'z.instanceof(Uint8Array)',
      Decimal: this.decimalResultExpression(),
      BigInt: 'z.bigint()',
    };

    const baseType = typeMap[field.type] || (isJsonSchemaCompatible ? 'z.any()' : 'z.unknown()');

    // Handle arrays
    if (field.isList) {
      return `z.array(${baseType})`;
    }

    return baseType;
  }

  private getBaseModelSchema(model: DMMF.Model): string {
    // This would typically reference the generated model schema
    return `${model.name}Schema`;
  }

  private extractDependencies(context: ResultGenerationContext): string[] {
    const dependencies: string[] = [];

    if (context.options.includeRelations) {
      context.options.includeRelations.forEach((relation) => {
        const relationField = context.model.fields.find((f) => f.name === relation);
        if (relationField && relationField.type !== context.model.name) {
          dependencies.push(`${relationField.type}Schema`);
        }
      });
    }

    return dependencies;
  }

  private generateDocumentation(options: ResultSchemaOptions, description: string): string {
    return `/**
 * ${description} for ${options.modelName} ${options.operationType} operation
 * Generated at: ${new Date().toISOString()}
 */`;
  }

  private generateExamples(context: ResultGenerationContext, type: string): string[] {
    // Generate example usage based on the result type
    const examples: string[] = [];
    const schemaName = this.generateSchemaName(context.options);

    switch (type) {
      case 'single':
        examples.push(`const result = ${schemaName}.parse(apiResponse);`);
        break;
      case 'array':
        examples.push(`const results = ${schemaName}.parse(apiResponse);`);
        break;
      case 'batch':
        examples.push(`const batchResult = ${schemaName}.parse({ count: 5 });`);
        break;
    }

    return examples;
  }

  private generateCacheKey(options: ResultSchemaOptions): string {
    return `${options.modelName}:${options.operationType}:${JSON.stringify({
      includeRelations: options.includeRelations?.sort(),
      excludeFields: options.excludeFields?.sort(),
      paginationSupport: options.paginationSupport,
      nullableResult: options.nullableResult,
    })}`;
  }

  /**
   * Public utility methods
   */
}

export default ResultSchemaGenerator;
