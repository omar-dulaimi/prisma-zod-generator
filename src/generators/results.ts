/**
 * Result Schema Generator
 * Generates Zod schemas for Prisma operation return values to enable validation of API responses and operation results
 */

import { DMMF } from '@prisma/generator-helper';

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
  relatedModels: Map<string, DMMF.Model>;
  fieldTypeMap: Map<string, string>;
}

/**
 * Result Schema Generator
 * Main class for generating Zod schemas for Prisma operation results
 */
export class ResultSchemaGenerator {
  private generatedSchemas: Map<string, GeneratedResultSchema> = new Map();
  private baseModelSchemas: Map<string, string> = new Map();

  constructor() {
    // Initialize with base configurations
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
    const relatedModels = new Map<string, DMMF.Model>();
    const fieldTypeMap = new Map<string, string>();

    // Build field type mapping
    model.fields.forEach((field) => {
      fieldTypeMap.set(field.name, this.mapPrismaTypeToZod(field));

      // Collect related models for relation fields
      if (field.kind === 'object' && field.type !== model.name) {
        // In a real implementation, you'd get this from the DMMF
        // For now, we'll create a placeholder
        relatedModels.set(field.type, {
          name: field.type,
          fields: [],
          dbName: null,
          schema: null,
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        } as DMMF.Model);
      }
    });

    return {
      model,
      options,
      baseModelSchema: this.getBaseModelSchema(model),
      relatedModels,
      fieldTypeMap,
    };
  }

  /**
   * Generate single result schema (for operations returning one model or null)
   */
  private generateSingleResultSchema(context: ResultGenerationContext): GeneratedResultSchema {
    const { options } = context;
    const schemaName = this.generateSchemaName(options);
    const baseSchema = this.buildBaseResultSchema(context);

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
    const baseSchema = this.buildBaseResultSchema(context);

    let zodSchema: string;
    let typeDefinition: string;

    if (options.paginationSupport) {
      const paginationSchema = this.generatePaginationSchema();
      zodSchema = `z.object({
  data: z.array(${baseSchema}),
  pagination: ${paginationSchema}
})`;
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

  private buildBaseResultSchema(context: ResultGenerationContext): string {
    const { model, options } = context;

    // Start with base model schema
    const fields = model.fields.filter((field) => {
      if (options.excludeFields?.includes(field.name)) return false;
      return true;
    });

    const fieldSchemas = fields.map((field) => {
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

    return `z.object({\n${fieldSchemas.join(',\n')}\n})`;
  }

  private buildRelationSchema(field: DMMF.Field): string {
    if (field.isList) {
      return `z.array(z.object({ /* ${field.type} fields */ }))`;
    }
    return `z.object({ /* ${field.type} fields */ }).optional()`;
  }

  private buildAggregateFields(model: DMMF.Model): string {
    const numericFields = model.fields.filter((f) =>
      ['Int', 'Float', 'Decimal', 'BigInt'].includes(f.type),
    );

    // _count: object with per-field counts (including booleans and relations), optional
    const countObjectFields = model.fields.map((field) => `    ${field.name}: z.number()`);
    const aggregateFields: string[] = [
      `  _count: z.object({\n${countObjectFields.join(',\n')}\n  }).optional()`,
    ];

    if (numericFields.length > 0) {
      // Sum: numbers for numeric fields; BigInt as bigint
      const sumFields = numericFields.map(
        (field) =>
          `    ${field.name}: ${field.type === 'BigInt' ? 'z.bigint()' : 'z.number()'}.nullable()`,
      );
      aggregateFields.push(
        `  _sum: z.object({\n${sumFields.join(',\n')}\n  }).nullable().optional()`,
      );

      // Avg: average results are numbers
      const avgFields = numericFields.map((field) => `    ${field.name}: z.number().nullable()`);
      aggregateFields.push(
        `  _avg: z.object({\n${avgFields.join(',\n')}\n  }).nullable().optional()`,
      );
    }

    // Min/max for comparable fields (include BigInt)
    const comparableFields = model.fields.filter((field) =>
      ['Int', 'Float', 'Decimal', 'DateTime', 'String', 'BigInt'].includes(field.type),
    );

    if (comparableFields.length > 0) {
      const minMaxFields = comparableFields.map((field) => {
        const zodType = this.mapPrismaTypeToZod(field);
        return `    ${field.name}: ${zodType}.nullable()`;
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
    const typeMap: Record<string, string> = {
      String: 'z.string()',
      Int: 'z.number().int()',
      Float: 'z.number()',
      Boolean: 'z.boolean()',
      DateTime: 'z.date()',
      Json: 'z.unknown()',
      Bytes: 'z.instanceof(Uint8Array)',
      Decimal: 'z.number()', // or z.string() depending on configuration
      BigInt: 'z.bigint()',
    };

    const baseType = typeMap[field.type] || 'z.unknown()';

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

  /**
   * Clear generated schema cache
   */
  clearCache(): void {
    this.generatedSchemas.clear();
  }

  /**
   * Get all generated schemas
   */
  getAllGeneratedSchemas(): GeneratedResultSchema[] {
    return Array.from(this.generatedSchemas.values());
  }

  /**
   * Register base model schema
   */
  registerBaseModelSchema(modelName: string, schema: string): void {
    this.baseModelSchemas.set(modelName, schema);
  }
}

export default ResultSchemaGenerator;
