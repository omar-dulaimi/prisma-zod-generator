import type {
  ConnectorType,
  DMMF as PrismaDMMF,
} from '@prisma/generator-helper';
import path from 'path';
import {
  findModelByName,
  isMongodbRawOp,
} from './helpers';
import { checkModelHasEnabledModelRelation } from './helpers/model-helpers';
import { isAggregateInputType } from './helpers/aggregate-helpers';
import { AggregateOperationSupport, TransformerParams } from './types';
import { writeFileSafely } from './utils/writeFileSafely';
import { writeIndexFile, addIndexExport } from './utils/writeIndexFile';
import { GeneratorConfig } from './config/parser';
import ResultSchemaGenerator from './generators/results';
import { extractFieldComment, parseZodAnnotations, mapAnnotationsToZodSchema, type FieldCommentContext } from './parsers/zodComments';
import { processModelsWithZodIntegration, type EnhancedModelInfo, type EnhancedFieldInfo } from './helpers/zod-integration';

/**
 * Filter validation result interface
 */
interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export default class Transformer {
  name: string;
  fields: PrismaDMMF.SchemaArg[];
  schemaImports = new Set<string>();
  models: PrismaDMMF.Model[];
  modelOperations: PrismaDMMF.ModelMapping[];
  aggregateOperationSupport: AggregateOperationSupport;
  enumTypes: PrismaDMMF.SchemaEnum[];
  enhancedModels: EnhancedModelInfo[];

  static enumNames: string[] = [];
  static rawOpsMap: { [name: string]: string } = {};
  static provider: ConnectorType;
  static previewFeatures: string[] | undefined;
  private static outputPath: string = './generated';
  private hasJson = false;
  private static prismaClientOutputPath: string = '@prisma/client';
  private static isCustomPrismaClientOutputPath: boolean = false;
  private static prismaClientProvider: string = 'prisma-client-js';
  private static prismaClientConfig: Record<string, unknown> = {};
  private static isGenerateSelect: boolean = false;
  private static isGenerateInclude: boolean = false;
  private static generatorConfig: GeneratorConfig | null = null;

  constructor(params: TransformerParams) {
    this.name = params.name ?? '';
    this.fields = params.fields ?? [];
    this.models = params.models ?? [];
    this.modelOperations = params.modelOperations ?? [];
    this.aggregateOperationSupport = params.aggregateOperationSupport ?? {};
    this.enumTypes = params.enumTypes ?? [];
    
    // Process models with Zod integration on initialization
    this.enhancedModels = processModelsWithZodIntegration(this.models, {
      enableZodAnnotations: true,
      generateFallbackSchemas: true,
      validateTypeCompatibility: true,
      collectDetailedErrors: true
    });
  }

  static setOutputPath(outPath: string) {
    this.outputPath = outPath;
  }

  static setIsGenerateSelect(isGenerateSelect: boolean) {
    this.isGenerateSelect = isGenerateSelect;
  }

  static setIsGenerateInclude(isGenerateInclude: boolean) {
    this.isGenerateInclude = isGenerateInclude;
  }

  static setGeneratorConfig(config: GeneratorConfig) {
    this.generatorConfig = config;
  }

  static getGeneratorConfig(): GeneratorConfig | null {
    return this.generatorConfig;
  }

  /**
   * Check if a model should be generated based on configuration
   */
  static isModelEnabled(modelName: string): boolean {
    const config = this.getGeneratorConfig();
    
    // If no configuration is available, generate all models (default behavior)
    if (!config) {
      return true;
    }

    // Check if model has specific configuration
    const modelConfig = config.models?.[modelName];
    if (modelConfig) {
      // If model config exists, check if it's explicitly enabled/disabled
      return modelConfig.enabled !== false;
    }

    // For minimal mode, only enable models that are explicitly configured
    if (config.mode === 'minimal') {
      return false;
    }

    // Default: enable all models not explicitly disabled
    return true;
  }

  /**
   * Get list of enabled models for generation
   */
  static getEnabledModels(allModels: PrismaDMMF.Model[]): PrismaDMMF.Model[] {
    return allModels.filter(model => this.isModelEnabled(model.name));
  }

  /**
   * Log information about model filtering
   */
  static logModelFiltering(allModels: PrismaDMMF.Model[]): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledModels = this.getEnabledModels(allModels);
    const disabledModels = allModels.filter(model => !this.isModelEnabled(model.name));

    if (disabledModels.length > 0) {
      console.log(`🚫 Models excluded from generation: ${disabledModels.map(m => m.name).join(', ')}`);
    }

    if (config.mode === 'minimal' && enabledModels.length < allModels.length) {
      console.log(`⚡ Minimal mode: generating ${enabledModels.length}/${allModels.length} models`);
    }
  }

  /**
   * Check if a specific operation should be generated for a model
   */
  static isOperationEnabled(modelName: string, operationName: string): boolean {
    const config = this.getGeneratorConfig();
    
    // If no configuration is available, generate all operations (default behavior)
    if (!config) {
      return true;
    }

    // Check if model has specific configuration
    const modelConfig = config.models?.[modelName];
    if (modelConfig && modelConfig.operations) {
      // Map operation names for backward compatibility
      const operationMapping: Record<string, string[]> = {
        'findMany': ['findMany'],
        'findUnique': ['findUnique'], 
        'findFirst': ['findFirst'],
        'createOne': ['create', 'createOne'],
        'createMany': ['create', 'createMany'],
        'updateOne': ['update', 'updateOne'],
        'updateMany': ['update', 'updateMany'],
        'deleteOne': ['delete', 'deleteOne'],
        'deleteMany': ['delete', 'deleteMany'],
        'upsertOne': ['upsert', 'upsertOne'],
        'aggregate': ['aggregate'],
        'groupBy': ['groupBy']
      };
      
      const allowedOperationNames = operationMapping[operationName] || [operationName];
      const isEnabled = allowedOperationNames.some(opName => modelConfig.operations!.includes(opName));
      
      return isEnabled;
    }

    // For minimal mode, only enable basic CRUD operations
    if (config.mode === 'minimal') {
      const minimalOperations = [
        'findMany', 'findUnique', 'findFirst',
        'create', 'createOne', 'createMany',
        'update', 'updateOne', 'updateMany', 
        'delete', 'deleteOne', 'deleteMany',
        'upsert', 'upsertOne'
      ];
      return minimalOperations.includes(operationName);
    }

    // Default: enable all operations not explicitly disabled
    return true;
  }

  /**
   * Get list of enabled operations for a model
   */
  static getEnabledOperations(modelName: string, allOperations: string[]): string[] {
    return allOperations.filter(operation => this.isOperationEnabled(modelName, operation));
  }

  /**
   * Log information about operation filtering for a model
   */
  static logOperationFiltering(modelName: string, allOperations: string[]): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledOperations = this.getEnabledOperations(modelName, allOperations);
    const disabledOperations = allOperations.filter(op => !this.isOperationEnabled(modelName, op));

    if (disabledOperations.length > 0) {
      console.log(`   🔧 ${modelName}: excluded operations [${disabledOperations.join(', ')}]`);
    }

    if (config.mode === 'minimal' && enabledOperations.length < allOperations.length) {
      console.log(`   ⚡ ${modelName}: minimal mode - ${enabledOperations.length}/${allOperations.length} operations`);
    }
  }

  /**
   * Check if a field should be included in schema generation
   */
  static isFieldEnabled(fieldName: string, modelName?: string, variant?: 'pure' | 'input' | 'result'): boolean {
    const config = this.getGeneratorConfig();
    
    
    // If no configuration is available, include all fields (default behavior)
    if (!config) {
      return true;
    }

    // Check global exclusions for the specified variant
    if (variant && config.globalExclusions?.[variant]?.includes(fieldName)) {
      return false;
    }

    // Check model-specific field exclusions
    if (modelName) {
      const modelConfig = config.models?.[modelName];
      
      // Check variant-specific exclusions (new format)
      if (modelConfig?.variants?.[variant || 'pure']?.excludeFields) {
        if (this.isFieldMatchingPatterns(fieldName, modelConfig.variants[variant || 'pure']!.excludeFields!)) {
          return false;
        }
      }
      
      // Check legacy format: fields.exclude (for backward compatibility)
      if ((modelConfig as any)?.fields?.exclude) {
        if (this.isFieldMatchingPatterns(fieldName, (modelConfig as any).fields.exclude)) {
          return false;
        }
      }
    }

    // Default: include all fields not explicitly excluded
    return true;
  }

  /**
   * Check if a field name matches any pattern in the exclusion list
   * Supports wildcards: *field, field*, *field*
   */
  static isFieldMatchingPatterns(fieldName: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Exact match (no wildcards)
      if (!pattern.includes('*')) {
        return fieldName === pattern;
      }
      
      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')  // Escape dots FIRST
        .replace(/\*/g, '.*');  // Then replace * with .*
      
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(fieldName);
    });
  }

  /**
   * Filter fields based on configuration and relationship preservation
   */
  static filterFields(fields: PrismaDMMF.SchemaArg[], modelName?: string, variant?: 'pure' | 'input' | 'result'): PrismaDMMF.SchemaArg[] {
    return fields.filter(field => {
      // Check basic field inclusion rules
      if (!this.isFieldEnabled(field.name, modelName, variant)) {
        return false;
      }
      
      // For relation fields, also check if the related model is enabled
      // This is a safety check for schema args that might represent relation fields
      if (this.isRelationFieldArg(field)) {
        const relatedModelName = this.extractRelatedModelFromFieldArg(field);
        if (relatedModelName && !this.isModelEnabled(relatedModelName)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Check if a schema arg represents a relation field
   */
  static isRelationFieldArg(field: PrismaDMMF.SchemaArg): boolean {
    // Check if the field type suggests it's a relation
    return field.inputTypes.some(inputType => {
      return inputType.location === 'inputObjectTypes' && 
             ((inputType.type as string).includes('WhereInput') ||
             (inputType.type as string).includes('CreateInput') ||
             (inputType.type as string).includes('UpdateInput') ||
             (inputType.type as string).includes('ListRelationFilter') ||
             (inputType.type as string).includes('RelationFilter') ||
             (inputType.type as string).includes('CreateNested') ||
             (inputType.type as string).includes('UpdateNested') ||
             (inputType.type as string).includes('OrderByRelation'));
    });
  }

  /**
   * Extract related model name from field arg
   */
  static extractRelatedModelFromFieldArg(field: PrismaDMMF.SchemaArg): string | null {
    for (const inputType of field.inputTypes) {
      if (inputType.location === 'inputObjectTypes') {
        const typeName = inputType.type as string;
        
        // Handle specific relation filter patterns first
        if (typeName.includes('ListRelationFilter')) {
          // Extract from "PostListRelationFilter" -> "Post"
          const match = typeName.match(/^(\w+)ListRelationFilter$/);
          if (match) return match[1];
        }
        
        // Extract model name from other types like "PostWhereInput", "UserCreateInput", etc.
        const match = typeName.match(/^(\w+)(?:Where|Create|Update|OrderBy|RelationFilter|CreateNested|UpdateNested)/);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  }

  /**
   * Extract model name from object schema context
   */
  static extractModelNameFromContext(schemaName: string): string | null {
    // Try to extract model name from common schema naming patterns
    const patterns = [
      /^(\w+)WhereInput$/,
      /^(\w+)WhereUniqueInput$/,
      /^(\w+)CreateInput$/,
      /^(\w+)UpdateInput$/,
      /^(\w+)UncheckedCreateInput$/,
      /^(\w+)UncheckedUpdateInput$/,
      /^(\w+)OrderByWithRelationInput$/,
      /^(\w+)Args$/,
    ];
    
    for (const pattern of patterns) {
      const match = schemaName.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Determine schema variant from context
   */
  static determineSchemaVariant(schemaName: string): 'pure' | 'input' | 'result' {
    // Determine variant based on schema name patterns
    if (schemaName.includes('Create') || schemaName.includes('Update') || schemaName.includes('Where')) {
      return 'input';
    }
    
    if (schemaName.includes('Result') || schemaName.includes('Output')) {
      return 'result';
    }
    
    return 'pure'; // Default variant
  }

  /**
   * Log information about field filtering
   */
  static logFieldFiltering(originalCount: number, filteredCount: number, modelName?: string, variant?: string): void {
    if (originalCount !== filteredCount) {
      const context = modelName ? `${modelName}${variant ? ` (${variant})` : ''}` : 'schema';
      console.log(`   🎯 ${context}: filtered ${originalCount - filteredCount} fields (${filteredCount}/${originalCount} remaining)`);
    }
  }

  /**
   * Check if a model has relationships to other ENABLED models
   * This is a filtered version of checkModelHasModelRelation that only considers enabled models
   */
  static checkModelHasEnabledModelRelation(model: PrismaDMMF.Model): boolean {
    const { fields: modelFields } = model;
    for (const modelField of modelFields) {
      if (this.isEnabledRelationField(modelField)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a relation field points to an enabled model
   */
  static isEnabledRelationField(modelField: PrismaDMMF.Field): boolean {
    const { kind, relationName, type } = modelField;
    
    // Must be an object relation field
    if (kind !== 'object' || !relationName) {
      return false;
    }

    // Check if the related model is enabled
    const relatedModelName = type;
    return this.isModelEnabled(relatedModelName);
  }

  /**
   * Filter relation fields to only include those pointing to enabled models
   */
  static filterRelationFields(fields: PrismaDMMF.Field[]): PrismaDMMF.Field[] {
    return fields.filter(field => {
      // Include non-relation fields
      if (field.kind !== 'object' || !field.relationName) {
        return true;
      }
      
      // Only include relation fields if the related model is enabled
      return this.isEnabledRelationField(field);
    });
  }

  /**
   * Get list of enabled related models for a given model
   */
  static getEnabledRelatedModels(model: PrismaDMMF.Model): string[] {
    const relatedModels = new Set<string>();
    
    for (const field of model.fields) {
      if (this.isEnabledRelationField(field)) {
        relatedModels.add(field.type);
      }
    }
    
    return Array.from(relatedModels);
  }

  /**
   * Check if a model should have include schemas generated
   * Only if it has relationships to other enabled models
   */
  static shouldGenerateIncludeSchema(model: PrismaDMMF.Model): boolean {
    return Transformer.isGenerateInclude && this.checkModelHasEnabledModelRelation(model);
  }

  /**
   * Check if a model should have select schemas generated  
   */
  static shouldGenerateSelectSchema(_model: PrismaDMMF.Model): boolean {
    return Transformer.isGenerateSelect;
  }

  /**
   * Log relationship preservation information
   */
  static logRelationshipPreservation(model: PrismaDMMF.Model): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledRelatedModels = this.getEnabledRelatedModels(model);
    const totalRelationFields = model.fields.filter(f => f.kind === 'object' && f.relationName).length;
    const enabledRelationFields = model.fields.filter(f => this.isEnabledRelationField(f)).length;

    if (totalRelationFields > enabledRelationFields) {
      const disabledRelations = totalRelationFields - enabledRelationFields;
      console.log(`   🔗 ${model.name}: ${disabledRelations} disabled relation(s) to filtered models`);
    }

    if (enabledRelatedModels.length > 0) {
      console.log(`   ✅ ${model.name}: active relations to [${enabledRelatedModels.join(', ')}]`);
    }
  }

  static getOutputPath() {
    return this.outputPath;
  }

  static setPrismaClientOutputPath(prismaClientCustomPath: string) {
    this.prismaClientOutputPath = prismaClientCustomPath;
    this.isCustomPrismaClientOutputPath =
      prismaClientCustomPath !== '@prisma/client';
  }

  static setPrismaClientProvider(provider: string) {
    this.prismaClientProvider = provider;
  }

  static setPrismaClientConfig(config: Record<string, unknown>) {
    this.prismaClientConfig = config;
  }

  static getPrismaClientProvider() {
    return this.prismaClientProvider;
  }

  static getPrismaClientConfig() {
    return this.prismaClientConfig;
  }

  /**
   * Determines the schemas directory path based on the output path.
   * If the output path already ends with 'schemas', use it directly.
   * Otherwise, append 'schemas' to the output path.
   */
  private static getSchemasPath(): string {
    const normalizedOutputPath = path.normalize(this.outputPath);
    const pathSegments = normalizedOutputPath.split(path.sep);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    if (lastSegment === 'schemas') {
      return this.outputPath;
    }
    
    return path.join(this.outputPath, 'schemas');
  }

  static async generateIndex() {
    const indexPath = path.join(Transformer.getSchemasPath(), 'index.ts');
    await writeIndexFile(indexPath);
  }

  async generateEnumSchemas() {
    for (const enumType of this.enumTypes) {
      const { name, values } = enumType;

      await writeFileSafely(
        path.join(Transformer.getSchemasPath(), `enums/${name}.schema.ts`),
        `${this.generateImportZodStatement()}\n${this.generateExportSchemaStatement(
          `${name}`,
          `z.enum(${JSON.stringify(values)})`,
        )}`,
      );
    }
  }

  generateImportZodStatement() {
    return "import { z } from 'zod';\n";
  }

  generateExportSchemaStatement(name: string, schema: string) {
    return `export const ${name}Schema = ${schema}`;
  }

  async generateObjectSchema() {
    const zodObjectSchemaFields = this.generateObjectSchemaFields();
    const objectSchema = this.prepareObjectSchema(zodObjectSchemaFields);
    const objectSchemaName = this.resolveObjectSchemaName();

    await writeFileSafely(
      path.join(
        Transformer.getSchemasPath(),
        `objects/${objectSchemaName}.schema.ts`,
      ),
      objectSchema,
    );
  }

  generateObjectSchemaFields() {
    // Determine context for field filtering  
    const modelName = Transformer.extractModelNameFromContext(this.name);
    const variant = Transformer.determineSchemaVariant(this.name);
    
    
    // Apply field filtering
    const originalFieldCount = this.fields.length;
    const filteredFields = Transformer.filterFields(this.fields, modelName || undefined, variant);
    
    
    // Log field filtering if any fields were excluded
    Transformer.logFieldFiltering(originalFieldCount, filteredFields.length, modelName || undefined, variant);
    
    const zodObjectSchemaFields = filteredFields
      .map((field) => this.generateObjectSchemaField(field))
      .flatMap((item) => item)
      .map((item) => {
        const [zodStringWithMainType, field, skipValidators] = item;

        const value = skipValidators
          ? zodStringWithMainType
          : this.generateFieldValidators(zodStringWithMainType, field);

        return value.trim();
      });
    return zodObjectSchemaFields;
  }

  generateObjectSchemaField(
    field: PrismaDMMF.SchemaArg,
  ): [string, PrismaDMMF.SchemaArg, boolean][] {
    const lines = field.inputTypes;

    if (lines.length === 0) {
      return [];
    }

    let alternatives = lines.reduce<string[]>((result, inputType) => {
      
      if (inputType.type === 'String') {
        result.push(this.wrapWithZodValidators('z.string()', field, inputType));
      } else if (inputType.type === 'Boolean') {
        result.push(
          this.wrapWithZodValidators('z.boolean()', field, inputType),
        );
      } else if (inputType.type === 'Int') {
        result.push(this.wrapWithZodValidators('z.number().int()', field, inputType));
      } else if (
        inputType.type === 'Float' ||
        inputType.type === 'Decimal'
      ) {
        result.push(this.wrapWithZodValidators('z.number()', field, inputType));
      } else if (inputType.type === 'BigInt') {
        result.push(this.wrapWithZodValidators('z.bigint()', field, inputType));
      } else if (inputType.type === 'Boolean') {
        result.push(
          this.wrapWithZodValidators('z.boolean()', field, inputType),
        );
      } else if (inputType.type === 'DateTime') {
        result.push(
          this.wrapWithZodValidators('z.coerce.date()', field, inputType),
        );
      } else if (inputType.type === 'Json') {
        this.hasJson = true;

        result.push(this.wrapWithZodValidators('jsonSchema', field, inputType));
      } else if (inputType.type === 'True') {
        result.push(
          this.wrapWithZodValidators('z.literal(true)', field, inputType),
        );
      } else if (inputType.type === 'Bytes') {
        result.push(
          this.wrapWithZodValidators(
            'z.instanceof(Uint8Array)',
            field,
            inputType,
          ),
        );
      } else {
        const isEnum = inputType.location === 'enumTypes';

        if (inputType.namespace === 'prisma' || isEnum) {
          if (
            inputType.type !== this.name &&
            typeof inputType.type === 'string'
          ) {
            this.addSchemaImport(inputType.type);
          }

          result.push(
            this.generatePrismaStringLine(field, inputType, lines.length),
          );
        }
      }

      return result;
    }, []);

    if (alternatives.length === 0) {
      return [];
    }

    if (alternatives.length > 1) {
      alternatives = alternatives.map((alter) =>
        alter.replace('.optional()', ''),
      );
    }

    const fieldName = alternatives.some((alt) => alt.includes(':'))
      ? ''
      : `  ${field.name}:`;

    const opt = !field.isRequired ? '.optional()' : '';

    let resString =
      alternatives.length === 1
        ? alternatives.join(',\r\n')
        : `z.union([${alternatives.join(',\r\n')}])${opt}`;

    if (field.isNullable) {
      resString += '.nullable()';
    }

    return [[`  ${fieldName} ${resString} `, field, true]];
  }

  wrapWithZodValidators(
    mainValidator: string,
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArg['inputTypes'][0],
  ) {
    let line: string = mainValidator;
    let hasEnhancedZodSchema = false;

    // Re-enabled @zod comment validations
    try {
      // Add safety check to prevent infinite loops
      if (field.name && typeof field.name === 'string' && field.name.length > 0) {
        const zodValidations = this.extractZodValidationsForField(field.name);
        
        if (zodValidations && zodValidations !== mainValidator) {
          line = zodValidations;
          hasEnhancedZodSchema = true;
        }
      }
    } catch (error) {
      // If @zod processing fails, continue with the default validator
      console.warn(`Failed to process @zod comments for field ${field.name}:`, error);
    }

    if (inputType.isList) {
      line += '.array()';
    }

    // Only add .optional() if we don't have an enhanced schema (which already includes optionality)
    if (!field.isRequired && !hasEnhancedZodSchema) {
      line += '.optional()';
    }

    return line;
  }

  addSchemaImport(name: string) {
    this.schemaImports.add(name);
  }

  /**
   * Extract @zod validations for a specific field using the enhanced model information
   */
  private extractZodValidationsForField(fieldName: string): string | null {
    // IMPORTANT: Don't apply field validations to Select schemas
    // Select schemas should always use boolean types regardless of the original field type
    if (this.name && this.name.includes('Select')) {
      return null;
    }

    // Basic validation
    if (!fieldName || !this.enhancedModels || this.enhancedModels.length === 0) {
      return null;
    }

    // Extract model name from the current transformer context
    const modelName = Transformer.extractModelNameFromContext(this.name);
    if (!modelName) {
      return null;
    }

    // Find the enhanced model information
    const enhancedModel = this.enhancedModels.find(em => em.model.name === modelName);
    if (!enhancedModel) {
      return null;
    }

    // Find the enhanced field information
    const enhancedField = enhancedModel.enhancedFields.find(ef => ef.field.name === fieldName);
    if (!enhancedField) {
      return null;
    }

    // Return the Zod schema if it has annotations and is valid
    if (enhancedField.hasZodAnnotations && enhancedField.zodSchema) {
      return enhancedField.zodSchema;
    }

    return null;
  }

  /**
   * Get the base Zod type for a model field
   */
  private getBaseZodTypeForField(field: PrismaDMMF.Field): string {
    switch (field.type) {
      case 'String':
        return 'z.string()';
      case 'Int':
        return 'z.number().int()';
      case 'Float':
      case 'Decimal':
        return 'z.number()';
      case 'Boolean':
        return 'z.boolean()';
      case 'DateTime':
        return 'z.coerce.date()';
      case 'Json':
        return 'z.unknown()'; // or jsonSchema depending on context
      case 'Bytes':
        return 'z.instanceof(Uint8Array)';
      case 'BigInt':
        return 'z.bigint()';
      default:
        // Handle enums and other types
        if (field.kind === 'enum') {
          return `z.nativeEnum(${field.type})`;
        }
        return 'z.unknown()';
    }
  }

  generatePrismaStringLine(
    field: PrismaDMMF.SchemaArg,
    inputType: PrismaDMMF.SchemaArg['inputTypes'][0],
    inputsLength: number,
  ) {
    const isEnum = inputType.location === 'enumTypes';

    const { isModelQueryType, modelName, queryName } =
      this.checkIsModelQueryType(inputType.type as string);

    const objectSchemaLine = isModelQueryType
      ? this.resolveModelQuerySchemaName(modelName as string, queryName as string)
      : `${inputType.type}ObjectSchema`;
    const enumSchemaLine = `${inputType.type}Schema`;

    const schema =
      inputType.type === this.name
        ? objectSchemaLine
        : isEnum
          ? enumSchemaLine
          : objectSchemaLine;

    const arr = inputType.isList ? '.array()' : '';

    const opt = !field.isRequired ? '.optional()' : '';

    // Only use lazy loading for self-references or complex object schemas that might have circular dependencies
    // Simple enums like SortOrder don't need lazy loading
    const needsLazyLoading = inputType.type === this.name || (!isEnum && inputType.namespace === 'prisma');

    if (needsLazyLoading) {
      return inputsLength === 1
        ? `  ${field.name}: z.lazy(() => ${schema})${arr}${opt}`
        : `z.lazy(() => ${schema})${arr}${opt}`;
    } else {
      return inputsLength === 1
        ? `  ${field.name}: ${schema}${arr}${opt}`
        : `${schema}${arr}${opt}`;
    }
  }

  generateFieldValidators(
    zodStringWithMainType: string,
    field: PrismaDMMF.SchemaArg,
  ) {
    const { isRequired, isNullable } = field;

    if (!isRequired) {
      zodStringWithMainType += '.optional()';
    }

    if (isNullable) {
      zodStringWithMainType += '.nullable()';
    }

    return zodStringWithMainType;
  }

  prepareObjectSchema(zodObjectSchemaFields: string[]) {
    const objectSchema = `${this.generateExportObjectSchemaStatement(
      this.addFinalWrappers({ zodStringFields: zodObjectSchemaFields }),
    )}\n`;

    const prismaImportStatement = this.generateImportPrismaStatement();

    const json = this.generateJsonSchemaImplementation();

    return `${this.generateObjectSchemaImportStatements()}${prismaImportStatement}${json}${objectSchema}`;
  }

  generateExportObjectSchemaStatement(schema: string) {
    let name = this.name;
    let exportName = this.name;
    if (Transformer.provider === 'mongodb') {
      if (isMongodbRawOp(name)) {
        name = Transformer.rawOpsMap[name];
        exportName = name.replace('Args', '');
      }
    }

    if (isAggregateInputType(name)) {
      name = `${name}Type`;
    }
    
    const end = `export const ${exportName}ObjectSchema = Schema`;
    
    // Args types like UserArgs, ProfileArgs don't exist in Prisma client
    // Use generic typing instead of non-existent Prisma type
    if (name.endsWith('Args')) {
      return `const Schema: z.ZodType<any> = ${schema};\n\n ${end}`;
    }
    
    // For schemas with complex relations, omit explicit typing
    // to avoid TypeScript inference issues with z.lazy()
    if (this.hasComplexRelations() && (
      name.endsWith('CreateInput') || 
      name.includes('CreateOrConnect') ||
      name.includes('CreateNestedOne') ||
      name.includes('CreateNestedMany')
    )) {
      return `const Schema: z.ZodType<any> = ${schema};\n\n ${end}`;
    }
    
    // Check if the Prisma type actually exists before using it
    // Many filter and input types don't exist in the Prisma client
    if (this.isPrismaTypeAvailable(name)) {
      return `const Schema: z.ZodType<Prisma.${name}> = ${schema};\n\n ${end}`;
    } else {
      // Fallback to generic schema with explicit any type annotation to avoid TypeScript errors
      return `const Schema: z.ZodType<any> = ${schema};\n\n ${end}`;
    }
  }

  private isPrismaTypeAvailable(name: string): boolean {
    // Based on analysis of actual Prisma client exports
    // Only these patterns of types exist in the Prisma namespace:
    
    // 1. ScalarFieldEnum types (e.g., MySQLUserScalarFieldEnum)
    if (name.endsWith('ScalarFieldEnum')) {
      return true;
    }
    
    // 2. OrderByRelevanceFieldEnum types (e.g., MySQLUserOrderByRelevanceFieldEnum)
    if (name.endsWith('OrderByRelevanceFieldEnum')) {
      return true;
    }
    
    // 3. Special built-in types that always exist
    const builtInTypes = [
      'JsonNullValueFilter',
      'JsonNullValueInput', 
      'NullableJsonNullValueInput',
      'SortOrder',
      'NullsOrder',
      'QueryMode',
      'TransactionIsolationLevel'
    ];
    if (builtInTypes.includes(name)) {
      return true;
    }
    
    // 4. Basic operation types that exist (without provider prefix)
    // Remove provider prefix for checking
    const nameWithoutProvider = name.replace(/^(MySQL|PostgreSQL|MongoDB|SQLite|SQLServer)/, '');
    const basicTypes = [
      'WhereInput',
      'OrderByWithRelationInput', 
      'WhereUniqueInput',
      'CreateInput',
      'UpdateInput',
      'UncheckedCreateInput',
      'UncheckedUpdateInput'
    ];
    
    // Check if it's a basic type that should exist
    if (basicTypes.some(type => nameWithoutProvider.endsWith(type))) {
      // But filter types, nested types, and many input envelope types don't exist
      if (nameWithoutProvider.includes('Filter') || 
          nameWithoutProvider.includes('Nested') ||
          nameWithoutProvider.includes('InputEnvelope') ||
          nameWithoutProvider.includes('FieldUpdateOperations') ||
          nameWithoutProvider.includes('WithAggregates')) {
        return false;
      }
      return true;
    }
    
    // All other types (especially Filter types, FieldUpdateOperations, etc.) don't exist
    return false;
  }

  private hasComplexRelations(): boolean {
    // Check if this schema has any lazy-loaded relation fields
    return this.fields.some(field => 
      field.inputTypes.some(inputType => 
        inputType.location !== 'enumTypes' && 
        inputType.namespace === 'prisma' && 
        typeof inputType.type === 'string' &&
        inputType.type !== this.name &&
        (inputType.type.includes('CreateNestedOneWithout') ||
         inputType.type.includes('CreateNestedManyWithout') ||
         inputType.type.includes('WhereUniqueInput') ||
         inputType.type.includes('CreateWithout') ||
         inputType.type.includes('UncheckedCreateWithout'))
      )
    );
  }

  addFinalWrappers({ zodStringFields }: { zodStringFields: string[] }) {
    const fields = [...zodStringFields];

    return this.wrapWithZodObject(fields) + '.strict()';
  }

  generateImportPrismaStatement() {
    let prismaClientImportPath: string;
    if (Transformer.isCustomPrismaClientOutputPath) {
      /**
       * If a custom location was designated for the prisma client, we need to figure out the
       * relative path from {schemas path}/objects to {prismaClientCustomPath}
       */
      const fromPath = path.join(Transformer.getSchemasPath(), 'objects');
      const toPath = Transformer.prismaClientOutputPath as string;
      const relativePathFromOutputToPrismaClient = path
        .relative(fromPath, toPath)
        .split(path.sep)
        .join(path.posix.sep);
      prismaClientImportPath = relativePathFromOutputToPrismaClient;
    } else {
      /**
       * If the default output path for prisma client (@prisma/client) is being used, we can import from it directly
       * without having to resolve a relative path
       */
      prismaClientImportPath = Transformer.prismaClientOutputPath;
    }

    // Handle new prisma-client generator which requires /client suffix for type imports
    // The new prisma-client generator can be detected by the presence of moduleFormat or runtime in config
    // These fields only exist in the new generator
    const isNewPrismaClientGenerator = Transformer.prismaClientProvider === 'prisma-client' ||
                                       Transformer.prismaClientConfig.moduleFormat !== undefined ||
                                       Transformer.prismaClientConfig.runtime !== undefined;
    
    const needsClientSuffix = isNewPrismaClientGenerator && 
                               Transformer.isCustomPrismaClientOutputPath && 
                               !prismaClientImportPath.endsWith('/client') &&
                               !prismaClientImportPath.includes('@prisma/client');
    const finalImportPath = needsClientSuffix ? `${prismaClientImportPath}/client` : prismaClientImportPath;
    
    return `import type { Prisma } from '${finalImportPath}';\n\n`;
  }

  generateJsonSchemaImplementation() {
    let jsonSchemaImplementation = '';

    if (this.hasJson) {
      jsonSchemaImplementation += `\n`;
      jsonSchemaImplementation += `const literalSchema = z.union([z.string(), z.number(), z.boolean()]);\n`;
      jsonSchemaImplementation += `const jsonSchema = z.lazy(() =>\n`;
      jsonSchemaImplementation += `  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(z.string(), jsonSchema.nullable())])\n`;
      jsonSchemaImplementation += `);\n\n`;
    }

    return jsonSchemaImplementation;
  }

  generateObjectSchemaImportStatements() {
    let generatedImports = this.generateImportZodStatement();
    generatedImports += this.generateSchemaImports();
    generatedImports += '\n\n';
    return generatedImports;
  }

  /**
   * Get the file extension to use for imports based on Prisma client configuration
   * For ESM with importFileExtension = "js", we need to add .js extension
   */
  private getImportFileExtension(): string {
    // Check if we're using the new prisma-client generator with ESM configuration
    const isNewPrismaClientGenerator = Transformer.prismaClientProvider === 'prisma-client' ||
                                       Transformer.prismaClientConfig.moduleFormat !== undefined ||
                                       Transformer.prismaClientConfig.runtime !== undefined;
    
    // If using ESM with importFileExtension specified, use that extension
    if (isNewPrismaClientGenerator && 
        Transformer.prismaClientConfig.moduleFormat === 'esm' &&
        Transformer.prismaClientConfig.importFileExtension) {
      return `.${Transformer.prismaClientConfig.importFileExtension}`;
    }
    
    // Default to no extension for backward compatibility
    return '';
  }

  /**
   * Generate an import statement with the correct file extension for ESM support
   */
  private generateImportStatement(importName: string, importPath: string): string {
    const extension = this.getImportFileExtension();
    return `import { ${importName} } from '${importPath}${extension}'`;
  }

  /**
   * Generate import statement with validation - only if target will be generated
   */
  static generateValidatedImportStatement(importName: string, importPath: string, modelName?: string): string {
    // Check if the target schema should be generated
    if (!Transformer.shouldGenerateImport(importName, modelName)) {
      return '';
    }

    const extension = Transformer.getImportFileExtension();
    return `import { ${importName} } from '${importPath}${extension}'`;
  }

  /**
   * Check if an import should be generated based on filtering rules
   */
  static shouldGenerateImport(importName: string, relatedModelName?: string): boolean {
    // If a related model is specified, check if it's enabled
    if (relatedModelName && !Transformer.isModelEnabled(relatedModelName)) {
      return false;
    }

    // Check if the import represents a schema that would be filtered out
    const extractedModelName = Transformer.extractModelFromImportName(importName);
    if (extractedModelName && !Transformer.isModelEnabled(extractedModelName)) {
      return false;
    }

    // Default: generate the import
    return true;
  }

  /**
   * Extract model name from import name
   */
  static extractModelFromImportName(importName: string): string | null {
    // Common patterns for import names
    const patterns = [
      /^(\w+)WhereInputObjectSchema$/,
      /^(\w+)WhereUniqueInputObjectSchema$/,
      /^(\w+)CreateInputObjectSchema$/,
      /^(\w+)UpdateInputObjectSchema$/,
      /^(\w+)UncheckedCreateInputObjectSchema$/,
      /^(\w+)UncheckedUpdateInputObjectSchema$/,
      /^(\w+)SelectObjectSchema$/,
      /^(\w+)IncludeObjectSchema$/,
      /^(\w+)ScalarFieldEnumSchema$/,
      /^(\w+)OrderByWithRelationInputObjectSchema$/,
      /^(\w+)OrderByWithAggregationInputObjectSchema$/,
    ];

    for (const pattern of patterns) {
      const match = importName.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get import file extension (static version)
   */
  static getImportFileExtension(): string {
    // This mirrors the instance method but as static
    return '.js';
  }

  generateSchemaImports() {
    // Get the file extension to use for imports (for ESM support)
    const importExtension = this.getImportFileExtension();
    
    return [...this.schemaImports]
      .map((name) => {
        const { isModelQueryType, modelName, queryName } =
          this.checkIsModelQueryType(name);
        if (isModelQueryType) {
          return `import { ${this.resolveModelQuerySchemaName(
            modelName as string,
            queryName as string,
          )} } from '../${queryName}${modelName}.schema${importExtension}'`;
        } else if (Transformer.enumNames.includes(name)) {
          return `import { ${name}Schema } from '../enums/${name}.schema${importExtension}'`;
        } else {
          return `import { ${name}ObjectSchema } from './${name}.schema${importExtension}'`;
        }
      })
      .join(';\r\n');
  }

  checkIsModelQueryType(type: string) {
    const modelQueryTypeSuffixToQueryName: Record<string, string> = {
      FindManyArgs: 'findMany',
    };
    for (const modelQueryType of ['FindManyArgs']) {
      if (type.includes(modelQueryType)) {
        const modelQueryTypeSuffixIndex = type.indexOf(modelQueryType);
        return {
          isModelQueryType: true,
          modelName: type.substring(0, modelQueryTypeSuffixIndex),
          queryName: modelQueryTypeSuffixToQueryName[modelQueryType],
        };
      }
    }
    return { isModelQueryType: false };
  }

  resolveModelQuerySchemaName(modelName: string, queryName: string) {
    const modelNameCapitalized =
      modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const queryNameCapitalized =
      queryName.charAt(0).toUpperCase() + (queryName as string).slice(1);
    return `${modelNameCapitalized}${queryNameCapitalized}Schema`;
  }

  wrapWithZodUnion(zodStringFields: string[]) {
    let wrapped = '';

    wrapped += 'z.union([';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields.join(',');
    wrapped += '\n';
    wrapped += '])';
    return wrapped;
  }

  wrapWithZodObject(zodStringFields: string | string[]) {
    let wrapped = '';

    wrapped += 'z.object({';
    wrapped += '\n';
    wrapped += '  ' + zodStringFields;
    wrapped += '\n';
    wrapped += '})';
    return wrapped;
  }

  resolveObjectSchemaName() {
    let name = this.name;
    let exportName = this.name;
    if (isMongodbRawOp(name)) {
      name = Transformer.rawOpsMap[name];
      exportName = name.replace('Args', '');
    }
    return exportName;
  }

  async generateModelSchemas() {
    // Perform comprehensive filter validation
    const isValid = Transformer.performFilterValidation(this.models);
    if (!isValid) {
      throw new Error('Filter validation failed. Please fix the configuration errors above.');
    }

    // Log model filtering information
    Transformer.logModelFiltering(this.models);

    for (const modelOperation of this.modelOperations) {
      const {
        model: modelName,
        findUnique,
        findFirst,
        findMany,
        // @ts-expect-error - Legacy API compatibility
        createOne,
        createMany,
        // @ts-expect-error - Legacy API compatibility
        deleteOne,
        // @ts-expect-error - Legacy API compatibility
        updateOne,
        deleteMany,
        updateMany,
        // @ts-expect-error - Legacy API compatibility
        upsertOne,
        aggregate,
        groupBy,
      } = modelOperation;

      // Skip generation for disabled models based on configuration
      if (!Transformer.isModelEnabled(modelName)) {
        continue;
      }

      // Log operation filtering information for this model
      const allOperations = [
        findUnique, findFirst, findMany, createOne, createMany,
        deleteOne, deleteMany, updateOne, updateMany, upsertOne,
        aggregate, groupBy
      ].filter(Boolean); // Remove undefined operations
      
      Transformer.logOperationFiltering(modelName, allOperations);

      const model = findModelByName(this.models, modelName) as PrismaDMMF.Model;

      const {
        selectImport,
        includeImport,
        selectZodSchemaLine,
        includeZodSchemaLine,
        selectZodSchemaLineLazy,
        includeZodSchemaLineLazy,
      } = this.resolveSelectIncludeImportAndZodSchemaLine(model);

      const { orderByImport, orderByZodSchemaLine } =
        this.resolveOrderByWithRelationImportAndZodSchemaLine(model);

      if (findUnique && Transformer.isOperationEnabled(modelName, 'findUnique')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findUnique}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}FindUnique`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema })`,
          )}`,
        );
      }

      if (findFirst && Transformer.isOperationEnabled(modelName, 'findFirst')) {
        const imports = [
          selectImport,
          includeImport,
          orderByImport,
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
          this.generateImportStatement(`${modelName}ScalarFieldEnumSchema`, `./enums/${modelName}ScalarFieldEnum.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findFirst}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}FindFirst`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.array(${modelName}ScalarFieldEnumSchema).optional() })`,
          )}`,
        );
      }

      if (findMany && Transformer.isOperationEnabled(modelName, 'findMany')) {
        const imports = [
          selectImport,
          includeImport,
          orderByImport,
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
          this.generateImportStatement(`${modelName}ScalarFieldEnumSchema`, `./enums/${modelName}ScalarFieldEnum.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}FindMany`,
            `z.object({ ${selectZodSchemaLineLazy} ${includeZodSchemaLineLazy} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.array(${modelName}ScalarFieldEnumSchema).optional()  })`,
          )}`,
        );
      }

      if (createOne && Transformer.isOperationEnabled(modelName, 'createOne')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}CreateInputObjectSchema`, `./objects/${modelName}CreateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedCreateInputObjectSchema`, `./objects/${modelName}UncheckedCreateInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${createOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}CreateOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}CreateInputObjectSchema, ${modelName}UncheckedCreateInputObjectSchema])  })`,
          )}`,
        );
      }

      if (createMany && Transformer.isOperationEnabled(modelName, 'createMany')) {
        const imports = [
          this.generateImportStatement(`${modelName}CreateManyInputObjectSchema`, `./objects/${modelName}CreateManyInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${createMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}CreateMany`,
            `z.object({ data: z.union([ ${modelName}CreateManyInputObjectSchema, z.array(${modelName}CreateManyInputObjectSchema) ]), ${
              Transformer.provider === 'postgresql' ||
              Transformer.provider === 'cockroachdb'
                ? 'skipDuplicates: z.boolean().optional()'
                : ''
            } })`,
          )}`,
        );
      }

      if (deleteOne && Transformer.isOperationEnabled(modelName, 'deleteOne')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${deleteOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}DeleteOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema  })`,
          )}`,
        );
      }

      if (deleteMany && Transformer.isOperationEnabled(modelName, 'deleteMany')) {
        const imports = [
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${deleteMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}DeleteMany`,
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional()  })`,
          )}`,
        );
      }

      if (updateOne && Transformer.isOperationEnabled(modelName, 'updateOne')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}UpdateInputObjectSchema`, `./objects/${modelName}UpdateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedUpdateInputObjectSchema`, `./objects/${modelName}UncheckedUpdateInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${updateOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}UpdateOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema]), where: ${modelName}WhereUniqueInputObjectSchema  })`,
          )}`,
        );
      }

      if (updateMany && Transformer.isOperationEnabled(modelName, 'updateMany')) {
        const imports = [
          this.generateImportStatement(`${modelName}UpdateManyMutationInputObjectSchema`, `./objects/${modelName}UpdateManyMutationInput.schema`),
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${updateMany}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}UpdateMany`,
            `z.object({ data: ${modelName}UpdateManyMutationInputObjectSchema, where: ${modelName}WhereInputObjectSchema.optional()  })`,
          )}`,
        );
      }

      if (upsertOne && Transformer.isOperationEnabled(modelName, 'upsertOne')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
          this.generateImportStatement(`${modelName}CreateInputObjectSchema`, `./objects/${modelName}CreateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedCreateInputObjectSchema`, `./objects/${modelName}UncheckedCreateInput.schema`),
          this.generateImportStatement(`${modelName}UpdateInputObjectSchema`, `./objects/${modelName}UpdateInput.schema`),
          this.generateImportStatement(`${modelName}UncheckedUpdateInputObjectSchema`, `./objects/${modelName}UncheckedUpdateInput.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${upsertOne}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}Upsert`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema, create: z.union([ ${modelName}CreateInputObjectSchema, ${modelName}UncheckedCreateInputObjectSchema ]), update: z.union([ ${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema ])  })`,
          )}`,
        );
      }

      if (aggregate && Transformer.isOperationEnabled(modelName, 'aggregate')) {
        const imports = [
          orderByImport,
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}WhereUniqueInputObjectSchema`, `./objects/${modelName}WhereUniqueInput.schema`),
        ];
        const aggregateOperations = [];
        if (this.aggregateOperationSupport[modelName].count) {
          imports.push(
            this.generateImportStatement(`${modelName}CountAggregateInputObjectSchema`, `./objects/${modelName}CountAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_count: z.union([ z.literal(true), ${modelName}CountAggregateInputObjectSchema ]).optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].min) {
          imports.push(
            this.generateImportStatement(`${modelName}MinAggregateInputObjectSchema`, `./objects/${modelName}MinAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_min: ${modelName}MinAggregateInputObjectSchema.optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].max) {
          imports.push(
            this.generateImportStatement(`${modelName}MaxAggregateInputObjectSchema`, `./objects/${modelName}MaxAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_max: ${modelName}MaxAggregateInputObjectSchema.optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].avg) {
          imports.push(
            this.generateImportStatement(`${modelName}AvgAggregateInputObjectSchema`, `./objects/${modelName}AvgAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_avg: ${modelName}AvgAggregateInputObjectSchema.optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].sum) {
          imports.push(
            this.generateImportStatement(`${modelName}SumAggregateInputObjectSchema`, `./objects/${modelName}SumAggregateInput.schema`),
          );
          aggregateOperations.push(
            `_sum: ${modelName}SumAggregateInputObjectSchema.optional()`,
          );
        }

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${aggregate}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}Aggregate`,
            `z.object({ ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), ${aggregateOperations.join(
              ', ',
            )} })`,
          )}`,
        );
      }

      if (groupBy && Transformer.isOperationEnabled(modelName, 'groupBy')) {
        const imports = [
          this.generateImportStatement(`${modelName}WhereInputObjectSchema`, `./objects/${modelName}WhereInput.schema`),
          this.generateImportStatement(`${modelName}OrderByWithAggregationInputObjectSchema`, `./objects/${modelName}OrderByWithAggregationInput.schema`),
          this.generateImportStatement(`${modelName}ScalarWhereWithAggregatesInputObjectSchema`, `./objects/${modelName}ScalarWhereWithAggregatesInput.schema`),
          this.generateImportStatement(`${modelName}ScalarFieldEnumSchema`, `./enums/${modelName}ScalarFieldEnum.schema`),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${groupBy}.schema.ts`),
          `${this.generateImportStatements(
            imports,
          )}${this.generateExportSchemaStatement(
            `${modelName}GroupBy`,
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: z.union([${modelName}OrderByWithAggregationInputObjectSchema, ${modelName}OrderByWithAggregationInputObjectSchema.array()]).optional(), having: ${modelName}ScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(${modelName}ScalarFieldEnumSchema)  })`,
          )}`,
        );
      }
    }
  }

  /**
   * Generate result schemas for all enabled models
   */
  async generateResultSchemas() {
    const config = Transformer.getGeneratorConfig();
    
    // Check if result schemas are enabled globally
    if (config?.variants?.result?.enabled === false) {
      console.log('⏭️  Result schema generation is disabled globally');
      return;
    }

    const resultGenerator = new ResultSchemaGenerator();

    for (const model of this.models) {
      // Skip generation for disabled models
      if (!Transformer.isModelEnabled(model.name)) {
        continue;
      }

      // Check if result schemas are enabled for this specific model
      const modelConfig = config?.models?.[model.name];
      if (modelConfig?.variants?.result?.enabled === false) {
        console.log(`⏭️  Result schema generation is disabled for model: ${model.name}`);
        continue;
      }

      console.log(`🎯 Generating result schemas for model: ${model.name}`);

      // Generate all result schemas for this model
      const resultSchemas = resultGenerator.generateAllResultSchemas(model);

      // Create results directory if it doesn't exist
      const resultsPath = path.join(Transformer.getSchemasPath(), 'results');

      // Write each result schema to appropriate file
      for (const resultSchema of resultSchemas) {
        const fileName = `${model.name}${resultSchema.operationType}Result.schema.ts`;
        const filePath = path.join(resultsPath, fileName);

        await writeFileSafely(
          filePath,
          `${this.generateImportStatements([
            this.generateImportStatement(`${model.name}ObjectSchema`, `../objects/${model.name}.schema`),
          ])}${resultSchema.zodSchema}`,
        );
      }

    }

    // Generate consolidated index file for all result schemas
    const resultIndexPath = path.join(Transformer.getSchemasPath(), 'results', 'index.ts');
    const allExports: string[] = [];

    // Collect all result schema exports for all processed models
    for (const model of this.models) {
      if (!Transformer.isModelEnabled(model.name)) {
        continue;
      }

      const modelConfig = config?.models?.[model.name];
      if (modelConfig?.variants?.result?.enabled === false) {
        continue;
      }

      const resultSchemas = resultGenerator.generateAllResultSchemas(model);
      for (const resultSchema of resultSchemas) {
        allExports.push(
          `export { ${resultSchema.schemaName} } from './${model.name}${resultSchema.operationType}Result.schema';`
        );
      }
    }

    if (allExports.length > 0) {
      await writeFileSafely(
        resultIndexPath,
        allExports.join('\n') + '\n',
      );
      
      // Add results index to main index exports
      addIndexExport(resultIndexPath);
    }
  }

  generateImportStatements(imports: (string | undefined)[]) {
    let generatedImports = this.generateImportZodStatement();
    
    // Filter out empty, undefined, and invalid imports
    const validImports = Transformer.cleanAndValidateImports(imports);
    
    // Log import management if any filtering occurred
    Transformer.logImportManagement(imports, validImports, this.name);
    
    generatedImports += validImports.join(';\r\n') ?? '';
    generatedImports += '\n\n';
    return generatedImports;
  }

  /**
   * Clean and validate import array, removing empty and invalid imports
   */
  static cleanAndValidateImports(imports: (string | undefined)[]): string[] {
    return imports
      .filter((importItem): importItem is string => {
        // Remove undefined/null/empty imports
        if (!importItem || importItem.trim() === '') {
          return false;
        }

        // Extract import information for validation
        const importInfo = Transformer.parseImportStatement(importItem);
        if (!importInfo) {
          return true; // Keep imports we can't parse (might be external libraries)
        }

        // Check if the import should be generated based on filtering rules
        return Transformer.shouldGenerateImport(importInfo.importName, importInfo.relatedModel);
      })
      .filter((importItem, index, array) => {
        // Remove duplicate imports
        return array.indexOf(importItem) === index;
      });
  }

  /**
   * Parse import statement to extract information
   */
  static parseImportStatement(importStatement: string): { importName: string; importPath: string; relatedModel?: string } | null {
    // Match import pattern: import { ImportName } from 'path'
    const match = importStatement.match(/import\s*\{\s*(\w+)\s*\}\s*from\s*['"]([^'"]+)['"]/);
    if (!match) {
      return null;
    }

    const importName = match[1];
    const importPath = match[2];
    const relatedModel = Transformer.extractModelFromImportName(importName);

    return {
      importName,
      importPath,
      relatedModel: relatedModel || undefined
    };
  }

  /**
   * Generate smart import statement that checks if target exists
   */
  generateSmartImportStatement(importName: string, importPath: string, relatedModel?: string): string {
    // Use the static validated version
    return Transformer.generateValidatedImportStatement(importName, importPath, relatedModel);
  }

  /**
   * Log import management information
   */
  static logImportManagement(originalImports: (string | undefined)[], cleanedImports: string[], context?: string): void {
    const originalCount = originalImports.filter(imp => imp && imp.trim()).length;
    const cleanedCount = cleanedImports.length;
    
    if (originalCount !== cleanedCount) {
      const contextStr = context ? ` for ${context}` : '';
      console.log(`   📦 Import cleanup${contextStr}: ${originalCount - cleanedCount} filtered (${cleanedCount}/${originalCount} kept)`);
    }
  }

  /**
   * Validate filter combinations and detect conflicts
   */
  static validateFilterCombinations(allModels: PrismaDMMF.Model[]): FilterValidationResult {
    const config = this.getGeneratorConfig();
    const result: FilterValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: []
    };

    if (!config) {
      return result; // No configuration to validate
    }

    // Check model dependencies and relationships
    this.validateModelDependencies(allModels, result);

    // Check operation consistency
    this.validateOperationConsistency(allModels, result);

    // Check field exclusion conflicts
    this.validateFieldExclusions(allModels, result);

    // Check variant consistency
    this.validateVariantConsistency(result);

    // Check mode consistency
    this.validateModeConsistency(result);

    return result;
  }

  /**
   * Validate model dependencies and relationships
   */
  static validateModelDependencies(allModels: PrismaDMMF.Model[], result: FilterValidationResult): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    for (const model of allModels) {
      if (!this.isModelEnabled(model.name)) continue;

      // Check if this model has relationships to disabled models
      const disabledRelations = model.fields.filter(field => {
        return field.kind === 'object' && 
               field.relationName && 
               !this.isModelEnabled(field.type);
      });

      if (disabledRelations.length > 0) {
        const disabledModels = disabledRelations.map(f => f.type);
        result.warnings.push(
          `Model "${model.name}" has relations to disabled models: ${disabledModels.join(', ')}. ` +
          `This may cause incomplete schema generation.`
        );

        result.suggestions.push(
          `Consider enabling models [${disabledModels.join(', ')}] or removing relation fields ` +
          `[${disabledRelations.map(f => f.name).join(', ')}] from ${model.name}`
        );
      }
    }
  }

  /**
   * Validate operation consistency across models
   */
  static validateOperationConsistency(allModels: PrismaDMMF.Model[], result: FilterValidationResult): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledModels = allModels.filter(m => this.isModelEnabled(m.name));
    
    for (const model of enabledModels) {
      const modelConfig = config.models?.[model.name];
      if (!modelConfig?.operations) continue;

      // Check for operations that require relationships
      const requiresRelations = ['aggregate', 'groupBy'];
      const hasEnabledRelations = checkModelHasEnabledModelRelation(model);

      for (const operation of requiresRelations) {
        if (modelConfig.operations.includes(operation) && !hasEnabledRelations) {
          result.warnings.push(
            `Model "${model.name}" has "${operation}" operation enabled but no active relationships. ` +
            `This operation may not function as expected.`
          );
        }
      }

      // Check for circular dependencies in custom operations
      if (modelConfig.operations.length === 0) {
        result.warnings.push(
          `Model "${model.name}" has no operations enabled. Consider disabling the model entirely.`
        );
      }
    }
  }

  /**
   * Validate field exclusion conflicts
   */
  static validateFieldExclusions(allModels: PrismaDMMF.Model[], result: FilterValidationResult): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledModels = allModels.filter(m => this.isModelEnabled(m.name));

    for (const model of enabledModels) {
      const modelConfig = config.models?.[model.name];
      if (!modelConfig?.variants) continue;

      // Check each variant for field exclusion conflicts
      Object.entries(modelConfig.variants).forEach(([variantName, variantConfig]) => {
        if (!variantConfig?.excludeFields) return;

        const variant = variantName as 'pure' | 'input' | 'result';
        
        // Check if all fields would be excluded
        const totalFields = model.fields.length;
        const excludedFields = variantConfig.excludeFields.length;
        
        if (excludedFields >= totalFields) {
          result.errors.push(
            `Model "${model.name}" ${variant} variant excludes all fields. This will result in empty schemas.`
          );
          result.isValid = false;
        }

        // Check for required fields being excluded
        const requiredFields = model.fields.filter(f => f.isRequired && f.kind === 'scalar');
        const excludedRequiredFields = requiredFields.filter(f => 
          variantConfig.excludeFields && variantConfig.excludeFields.includes(f.name)
        );
        
        if (excludedRequiredFields.length > 0 && variant === 'input') {
          result.warnings.push(
            `Model "${model.name}" ${variant} variant excludes required fields: ` +
            `${excludedRequiredFields.map(f => f.name).join(', ')}. This may cause validation issues.`
          );
        }
      });
    }
  }

  /**
   * Validate variant consistency
   */
  static validateVariantConsistency(result: FilterValidationResult): void {
    const config = this.getGeneratorConfig();
    if (!config?.variants) return;

    // Check if variants are configured but no models use them
    const configuredVariants = Object.keys(config.variants);
    const enabledVariants = configuredVariants.filter(variant => 
      config.variants && config.variants[variant as keyof typeof config.variants]?.enabled
    );

    if (enabledVariants.length === 0) {
      result.warnings.push(
        'Variants are configured but none are enabled. Consider enabling at least one variant or removing variant configuration.'
      );
    }

    // Check for conflicting variant settings
    if (config.mode === 'minimal' && enabledVariants.includes('result')) {
      result.warnings.push(
        'Minimal mode with result variant enabled may generate more schemas than expected. ' +
        'Consider using only pure and input variants in minimal mode.'
      );
    }
  }

  /**
   * Validate mode consistency
   */
  static validateModeConsistency(result: FilterValidationResult): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    // Check if minimal mode has models configured
    if (config.mode === 'minimal' && (!config.models || Object.keys(config.models).length === 0)) {
      result.errors.push(
        'Minimal mode requires explicit model configuration. No models are configured for generation.'
      );
      result.isValid = false;
      
      result.suggestions.push(
        'Add model configurations to your config file or switch to "full" mode for automatic model inclusion.'
      );
    }

    // Check if custom mode has meaningful configuration
    if (config.mode === 'custom' && (!config.models || Object.keys(config.models).length === 0)) {
      result.warnings.push(
        'Custom mode without model configurations will behave like full mode. Consider adding specific model settings.'
      );
    }
  }

  /**
   * Log filter validation results
   */
  static logFilterValidation(validationResult: FilterValidationResult): void {
    const { isValid, errors, warnings, suggestions } = validationResult;

    if (errors.length > 0) {
      console.log('❌ Filter Validation Errors:');
      errors.forEach(error => console.log(`   • ${error}`));
    }

    if (warnings.length > 0) {
      console.log('⚠️  Filter Validation Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    if (suggestions.length > 0) {
      console.log('💡 Suggestions:');
      suggestions.forEach(suggestion => console.log(`   • ${suggestion}`));
    }

    if (isValid && errors.length === 0 && warnings.length === 0) {
      console.log('✅ Filter configuration validation passed');
    }
  }

  /**
   * Perform comprehensive filter validation
   */
  static performFilterValidation(allModels: PrismaDMMF.Model[]): boolean {
    const validationResult = this.validateFilterCombinations(allModels);
    this.logFilterValidation(validationResult);
    
    return validationResult.isValid;
  }

  resolveSelectIncludeImportAndZodSchemaLine(model: PrismaDMMF.Model) {
    const { name: modelName } = model;

    // Log relationship preservation information
    Transformer.logRelationshipPreservation(model);

    const selectImport = Transformer.shouldGenerateSelectSchema(model)
      ? this.generateSmartImportStatement(`${modelName}SelectObjectSchema`, `./objects/${modelName}Select.schema`, modelName)
      : '';

    const includeImport = Transformer.shouldGenerateIncludeSchema(model)
      ? this.generateSmartImportStatement(`${modelName}IncludeObjectSchema`, `./objects/${modelName}Include.schema`, modelName)
      : '';

    let selectZodSchemaLine = '';
    let includeZodSchemaLine = '';
    let selectZodSchemaLineLazy = '';
    let includeZodSchemaLineLazy = '';

    if (Transformer.shouldGenerateSelectSchema(model)) {
      const zodSelectObjectSchema = `${modelName}SelectObjectSchema.optional()`;
      selectZodSchemaLine = `select: ${zodSelectObjectSchema},`;
      selectZodSchemaLineLazy = `select: z.lazy(() => ${zodSelectObjectSchema}),`;
    }

    if (Transformer.shouldGenerateIncludeSchema(model)) {
      const zodIncludeObjectSchema = `${modelName}IncludeObjectSchema.optional()`;
      includeZodSchemaLine = `include: ${zodIncludeObjectSchema},`;
      includeZodSchemaLineLazy = `include: z.lazy(() => ${zodIncludeObjectSchema}),`;
    }

    return {
      selectImport,
      includeImport,
      selectZodSchemaLine,
      includeZodSchemaLine,
      selectZodSchemaLineLazy,
      includeZodSchemaLineLazy,
    };
  }

  resolveOrderByWithRelationImportAndZodSchemaLine(model: PrismaDMMF.Model) {
    const { name: modelName } = model;
    let modelOrderBy = '';

    if (
      ['postgresql', 'mysql'].includes(Transformer.provider) &&
      Transformer.previewFeatures?.includes('fullTextSearch')
    ) {
      modelOrderBy = `${modelName}OrderByWithRelationAndSearchRelevanceInput`;
    } else {
      modelOrderBy = `${modelName}OrderByWithRelationInput`;
    }

    const orderByImport = this.generateImportStatement(`${modelOrderBy}ObjectSchema`, `./objects/${modelOrderBy}.schema`);
    const orderByZodSchemaLine = `orderBy: z.union([${modelOrderBy}ObjectSchema, ${modelOrderBy}ObjectSchema.array()]).optional(),`;

    return { orderByImport, orderByZodSchemaLine };
  }
}
