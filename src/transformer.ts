import type { ConnectorType, DMMF as PrismaDMMF } from '@prisma/generator-helper';
import path from 'path';
import { GeneratorConfig } from './config/parser';
import ResultSchemaGenerator from './generators/results';
import { findModelByName, isMongodbRawOp } from './helpers';
import { checkModelHasEnabledModelRelation } from './helpers/model-helpers';
import { processModelsWithZodIntegration, type EnhancedModelInfo } from './helpers/zod-integration';
import { AggregateOperationSupport, TransformerParams } from './types';
import { logger } from './utils/logger';
import { writeFileSafely } from './utils/writeFileSafely';
import { addIndexExport, writeIndexFile } from './utils/writeIndexFile';

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
  // Dual schema export configuration
  private static exportTypedSchemas: boolean = true; // Export z.ZodType<Prisma.Type> versions (type-safe)
  private static exportZodSchemas: boolean = true; // Export pure Zod versions (method-friendly)
  private static typedSchemaSuffix: string = 'Schema'; // Suffix for typed schemas (PostFindManySchema)
  private static zodSchemaSuffix: string = 'ZodSchema'; // Suffix for Zod schemas (PostFindManyZodSchema)
  // Track excluded field names for current object generation to inform typed Omit
  private lastExcludedFieldNames: string[] | null = null;
  private static jsonHelpersWritten = false;

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
      collectDetailedErrors: true,
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
  // Configuration setters
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
    return allModels.filter((model) => this.isModelEnabled(model.name));
  }

  /**
   * Log information about model filtering
   */
  static logModelFiltering(allModels: PrismaDMMF.Model[]): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledModels = this.getEnabledModels(allModels);
    const disabledModels = allModels.filter((model) => !this.isModelEnabled(model.name));

    if (disabledModels.length > 0) {
      logger.debug(
        `🚫 Models excluded from generation: ${disabledModels.map((m) => m.name).join(', ')}`,
      );
    }

    if (config.mode === 'minimal' && enabledModels.length < allModels.length) {
      logger.debug(
        `⚡ Minimal mode: generating ${enabledModels.length}/${allModels.length} models`,
      );
    }
  }

  /**
   * Check if a specific operation should be generated for a model
   */
  static isOperationEnabled(modelName: string, operationName: string): boolean {
    const config = this.getGeneratorConfig();

    // If no configuration is available, generate all operations (default behavior)
    if (!config) {
      logger.debug(`🔍 Operation check: ${modelName}.${operationName} = true (no config)`);
      return true;
    }

    // Check if model has specific configuration
    const modelConfig = config.models?.[modelName];
    if (modelConfig && modelConfig.operations) {
      // Map operation names for backward compatibility
      const operationMapping: Record<string, string[]> = {
        findMany: ['findMany'],
        findUnique: ['findUnique'],
        findFirst: ['findFirst'],
        createOne: ['create', 'createOne'],
        createMany: ['create', 'createMany'],
        updateOne: ['update', 'updateOne'],
        updateMany: ['update', 'updateMany'],
        deleteOne: ['delete', 'deleteOne'],
        deleteMany: ['delete', 'deleteMany'],
        upsertOne: ['upsert', 'upsertOne'],
        aggregate: ['aggregate'],
        groupBy: ['groupBy'],
        count: ['count'],
      };

      const allowedOperationNames = operationMapping[operationName] || [operationName];
      const isEnabled = allowedOperationNames.some(
        (opName) => modelConfig.operations?.includes(opName) ?? false,
      );

      logger.debug(
        `🔍 Operation check: ${modelName}.${operationName} = ${isEnabled} (configured ops: [${modelConfig.operations.join(', ')}])`,
      );
      return isEnabled;
    }

    // For minimal mode, only enable essential operations (no *Many, no upsert, no aggregate/groupBy)
    if (config.mode === 'minimal') {
      // Allow overrides via config.minimalOperations when present
      const configured = (config as unknown as { minimalOperations?: string[] }).minimalOperations;
      const baseAllowed =
        configured && Array.isArray(configured) && configured.length > 0
          ? configured
          : ['findMany', 'findUnique', 'findFirst', 'create', 'update', 'delete'];

      // Map legacy op names used in model mappings to these canonical names
      const opAliasMap: Record<string, string> = {
        createOne: 'create',
        updateOne: 'update',
        deleteOne: 'delete',
        upsertOne: 'upsert',
      };
      const canonical = opAliasMap[operationName] || operationName;
      const isEnabled = baseAllowed.includes(canonical);
      logger.debug(
        `🔍 Operation check: ${modelName}.${operationName} -> ${canonical} = ${isEnabled} (minimal mode)`,
      );
      return isEnabled;
    }

    // Default: enable all operations not explicitly disabled
    logger.debug(`🔍 Operation check: ${modelName}.${operationName} = true (default)`);
    return true;
  }

  /**
   * Get list of enabled operations for a model
   */
  static getEnabledOperations(modelName: string, allOperations: string[]): string[] {
    return allOperations.filter((operation) => this.isOperationEnabled(modelName, operation));
  }

  /**
   * Log information about operation filtering for a model
   */
  static logOperationFiltering(modelName: string, allOperations: string[]): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledOperations = this.getEnabledOperations(modelName, allOperations);
    const disabledOperations = allOperations.filter(
      (op) => !this.isOperationEnabled(modelName, op),
    );

    if (disabledOperations.length > 0) {
      logger.debug(`   🔧 ${modelName}: excluded operations [${disabledOperations.join(', ')}]`);
    }

    if (config.mode === 'minimal' && enabledOperations.length < allOperations.length) {
      logger.debug(
        `   ⚡ ${modelName}: minimal mode - ${enabledOperations.length}/${allOperations.length} operations`,
      );
    }
  }

  /**
   * Check if a field should be included in schema generation
   */
  static isFieldEnabled(
    fieldName: string,
    modelName?: string,
    variant?: 'pure' | 'input' | 'result',
  ): boolean {
    const config = this.getGeneratorConfig();

    // If no configuration is available, include all fields (default behavior)
    if (!config) {
      return true;
    }

    // Start with a flag indicating whether the field should be excluded
    let shouldExclude = false;
    const debugReasons: string[] = [];

    // Check global exclusions (basic format - array of strings)
    if (config.globalExclusions && Array.isArray(config.globalExclusions)) {
      if (this.isFieldMatchingPatterns(fieldName, config.globalExclusions)) {
        shouldExclude = true;
        debugReasons.push(`global array exclusion`);
      }
    }

    // Check global exclusions for the specified variant
    if (variant && config.globalExclusions?.[variant]) {
      if (this.isFieldMatchingPatterns(fieldName, config.globalExclusions[variant])) {
        shouldExclude = true;
        debugReasons.push(`global ${variant} exclusion`);
      }
    }

    // Check model-specific field exclusions and includes
    if (modelName) {
      const modelConfig = config.models?.[modelName];

      // Check model-specific includes FIRST - these OVERRIDE exclusions (highest precedence)
      const legacyFields = modelConfig as unknown as {
        fields?: { include?: string[]; exclude?: string[] };
      };
      if (legacyFields?.fields?.include) {
        if (this.isFieldMatchingPatterns(fieldName, legacyFields.fields.include)) {
          logger.debug(
            `🟢 Field enabled: ${modelName}.${fieldName} (${variant}) = true (model include override)`,
          );
          return true; // Include overrides any previous or subsequent exclusion
        }
      }

      // Check variant-specific exclusions (new format)
      if (modelConfig?.variants?.[variant || 'pure']?.excludeFields) {
        const ex = modelConfig.variants?.[variant || 'pure']?.excludeFields || [];
        if (this.isFieldMatchingPatterns(fieldName, ex)) {
          shouldExclude = true;
          debugReasons.push(`model ${variant} variant exclusion`);
        }
      }

      // Check legacy format: fields.exclude (for backward compatibility)
      if (legacyFields?.fields?.exclude) {
        logger.debug(
          `🔍 Checking legacy fields.exclude for ${modelName}.${fieldName}: patterns =`,
          legacyFields.fields.exclude,
        );
        if (this.isFieldMatchingPatterns(fieldName, legacyFields.fields.exclude)) {
          shouldExclude = true;
          debugReasons.push(`model fields.exclude`);
          logger.debug(`🚫 Field excluded by legacy fields.exclude: ${modelName}.${fieldName}`);
        }
      }
    }

    const result = !shouldExclude;
    if (
      debugReasons.length > 0 ||
      (modelName && ['password', 'views', 'internalId', 'metadata'].includes(fieldName))
    ) {
      logger.debug(
        `🔍 Field check: ${modelName || 'unknown'}.${fieldName} (${variant || 'unknown'}) = ${result} ${debugReasons.length > 0 ? `(${debugReasons.join(', ')})` : '(allowed)'}`,
      );
    }

    // Return the opposite of shouldExclude (if should exclude, return false)
    return result;
  }

  /**
   * Check if a field name matches any pattern in the exclusion list
   * Supports wildcards: *field, field*, *field*
   */
  static isFieldMatchingPatterns(fieldName: string, patterns: string[]): boolean {
    // Debug: Reduced verbosity for performance (uncomment for detailed debugging)
    // console.log(`🔍 Pattern matching: fieldName='${fieldName}', patterns=`, patterns);
    const result = patterns.some((pattern) => {
      // Exact match (no wildcards)
      if (!pattern.includes('*')) {
        const match = fieldName === pattern;
        // console.log(`   - Exact match '${pattern}': ${match}`);
        return match;
      }

      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots FIRST
        .replace(/\*/g, '.*'); // Then replace * with .*

      const regex = new RegExp(`^${regexPattern}$`);
      const match = regex.test(fieldName);
      // console.log(`   - Regex match '${pattern}' -> /${regexPattern}/: ${match}`);
      return match;
    });
    // console.log(`🔍 Pattern matching result: ${result}`);
    return result;
  }

  /**
   * Filter fields based on configuration and relationship preservation
   */
  static filterFields(
    fields: PrismaDMMF.SchemaArg[],
    modelName?: string,
    variant?: 'pure' | 'input' | 'result',
    models?: PrismaDMMF.Model[],
    schemaName?: string,
  ): PrismaDMMF.SchemaArg[] {
    const config = (this.getGeneratorConfig() || {}) as GeneratorConfig & {
      minimalOperations?: string[];
    };
    const strictCreateInputs = config.strictCreateInputs !== false; // default true
    const preserveRequiredScalarsOnCreate = config.preserveRequiredScalarsOnCreate !== false; // default true
    // Special case: WhereUniqueInput must retain unique identifier fields (e.g., id, unique columns)
    // Do NOT apply variant-based exclusions to this schema type
    const isWhereUniqueInput = !!schemaName && /WhereUniqueInput$/.test(schemaName);

    // Do not apply variant-based field exclusions to base Prisma Create input object schemas when strictCreateInputs is true
    // These must strictly match Prisma types to satisfy typed Zod bindings
    const isBasePrismaCreateInputName =
      !!schemaName &&
      [
        /^(\w+)CreateInput$/,
        /^(\w+)UncheckedCreateInput$/,
        /^(\w+)CreateManyInput$/,
        /^(\w+)CreateMany\w+Input$/,
        /^(\w+)CreateWithout\w+Input$/,
        /^(\w+)UncheckedCreateWithout\w+Input$/,
        /^(\w+)CreateOrConnectWithout\w+Input$/,
        /^(\w+)CreateNested(?:One|Many)Without\w+Input$/,
      ].some((re) => re.test(schemaName));
    const isBasePrismaCreateInput = isBasePrismaCreateInputName && strictCreateInputs;

    const filtered = fields.filter((field) => {
      // Check basic field inclusion rules
      if (
        !isWhereUniqueInput &&
        !isBasePrismaCreateInput &&
        !this.isFieldEnabled(field.name, modelName, variant)
      ) {
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

    // Handle foreign key preservation when relation fields are excluded
    const result = [...filtered];

    if (modelName && variant === 'input' && !isBasePrismaCreateInput && models) {
      const model = models.find((m: PrismaDMMF.Model) => m.name === modelName);
      if (model) {
        const excludedRelationFields = this.getExcludedRelationFields(fields, filtered, model);
        const foreignKeyFields = this.getForeignKeyFieldsForExcludedRelations(
          excludedRelationFields,
          model,
        );

        // Add foreign key fields that aren't already present AND aren't explicitly excluded
        for (const fkField of foreignKeyFields) {
          if (!result.some((field) => field.name === fkField.name)) {
            // Check if the foreign key field is explicitly excluded by configuration
            const isFieldAllowed = this.isFieldEnabled(fkField.name, modelName, variant);
            logger.debug(
              `🔑 Foreign key preservation check: ${modelName}.${fkField.name} (${variant}) = ${isFieldAllowed}`,
            );
            if (isFieldAllowed) {
              logger.debug(`🔑 Adding foreign key field: ${modelName}.${fkField.name}`);
              result.push(fkField);
            } else {
              logger.debug(`🚫 Skipping excluded foreign key field: ${modelName}.${fkField.name}`);
            }
          }
        }
      }
    }

    // If strictCreateInputs is false and this is a Create-like input, optionally re-add required non-auto scalars
    if (
      !strictCreateInputs &&
      isBasePrismaCreateInputName &&
      preserveRequiredScalarsOnCreate &&
      modelName &&
      models
    ) {
      const model = models.find((m: PrismaDMMF.Model) => m.name === modelName);
      if (model) {
        const requiredScalars = model.fields.filter(
          (f: PrismaDMMF.Field) =>
            f.kind === 'scalar' &&
            f.isRequired === true &&
            f.hasDefaultValue !== true &&
            (f as unknown as { isUpdatedAt?: boolean }).isUpdatedAt !== true,
        );
        for (const f of requiredScalars) {
          if (!result.some((arg) => arg.name === f.name)) {
            // Try to find the corresponding SchemaArg in original fields by name
            const original = fields.find((arg) => arg.name === f.name);
            if (original) result.push(original);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get excluded relation fields by comparing original and filtered fields
   */
  static getExcludedRelationFields(
    originalFields: PrismaDMMF.SchemaArg[],
    filteredFields: PrismaDMMF.SchemaArg[],
    model: PrismaDMMF.Model,
  ): PrismaDMMF.Field[] {
    const excludedFieldNames = originalFields
      .filter(
        (originalField) =>
          !filteredFields.some((filteredField) => filteredField.name === originalField.name),
      )
      .map((field) => field.name);

    return model.fields.filter(
      (field) =>
        excludedFieldNames.includes(field.name) &&
        field.kind === 'object' &&
        field.relationFromFields &&
        field.relationFromFields.length > 0,
    );
  }

  /**
   * Get foreign key schema args for excluded relation fields
   */
  static getForeignKeyFieldsForExcludedRelations(
    excludedRelationFields: PrismaDMMF.Field[],
    model: PrismaDMMF.Model,
  ): PrismaDMMF.SchemaArg[] {
    const foreignKeyFields: PrismaDMMF.SchemaArg[] = [];

    for (const relationField of excludedRelationFields) {
      if (!relationField.relationFromFields) continue;
      for (const fkFieldName of relationField.relationFromFields) {
        const fkField = model.fields.find((f) => f.name === fkFieldName);
        if (fkField && fkField.kind === 'scalar') {
          const inputTypes: PrismaDMMF.SchemaArg['inputTypes'] = [
            {
              type: fkField.type as unknown as string,
              location: 'scalar',
              isList: fkField.isList,
            },
          ];

          const schemaArg: PrismaDMMF.SchemaArg = {
            name: fkField.name,
            isRequired: fkField.isRequired,
            isNullable: !fkField.isRequired,
            inputTypes,
          } as PrismaDMMF.SchemaArg;
          foreignKeyFields.push(schemaArg);
        }
      }
    }
    return foreignKeyFields;
  }

  /**
   * Check if a schema arg represents a relation field
   */
  static isRelationFieldArg(field: PrismaDMMF.SchemaArg): boolean {
    // Check if the field type suggests it's a relation
    return field.inputTypes.some((inputType) => {
      return (
        inputType.location === 'inputObjectTypes' &&
        ((inputType.type as string).includes('WhereInput') ||
          (inputType.type as string).includes('CreateInput') ||
          (inputType.type as string).includes('UpdateInput') ||
          (inputType.type as string).includes('ListRelationFilter') ||
          (inputType.type as string).includes('RelationFilter') ||
          (inputType.type as string).includes('CreateNested') ||
          (inputType.type as string).includes('UpdateNested') ||
          (inputType.type as string).includes('OrderByRelation'))
      );
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
        const match = typeName.match(
          /^(\w+)(?:Where|Create|Update|OrderBy|RelationFilter|CreateNested|UpdateNested)/,
        );
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
    // More specific patterns should come first to avoid false matches
    const patterns = [
      // Basic input types - more specific patterns first
      /^(\w+)UncheckedCreateInput$/,
      /^(\w+)UncheckedUpdateInput$/,
      /^(\w+)UncheckedUpdateManyInput$/,
      /^(\w+)UpdateManyMutationInput$/,
      /^(\w+)WhereUniqueInput$/,
      /^(\w+)CreateManyInput$/,
      /^(\w+)UpdateManyInput$/,
      /^(\w+)WhereInput$/,
      /^(\w+)CreateInput$/,
      /^(\w+)UpdateInput$/,

      // Order by inputs
      /^(\w+)OrderByWithRelationInput$/,
      /^(\w+)OrderByWithAggregationInput$/,
      /^(\w+)OrderByRelationAggregateInput$/,

      // Filter inputs
      /^(\w+)ScalarWhereInput$/,
      /^(\w+)ScalarWhereWithAggregatesInput$/,
      /^(\w+)ListRelationFilter$/,
      /^(\w+)RelationFilter$/,
      /^(\w+)ScalarRelationFilter$/,

      // Aggregate inputs
      /^(\w+)CountAggregateInput$/,
      /^(\w+)CountOrderByAggregateInput$/,
      /^(\w+)AvgAggregateInput$/,
      /^(\w+)AvgOrderByAggregateInput$/,
      /^(\w+)MaxAggregateInput$/,
      /^(\w+)MaxOrderByAggregateInput$/,
      /^(\w+)MinAggregateInput$/,
      /^(\w+)MinOrderByAggregateInput$/,
      /^(\w+)SumAggregateInput$/,
      /^(\w+)SumOrderByAggregateInput$/,

      // Nested operation inputs
      /^(\w+)CreateNestedOneWithout\w+Input$/,
      /^(\w+)CreateNestedManyWithout\w+Input$/,
      /^(\w+)UpdateNestedOneWithout\w+Input$/,
      /^(\w+)UpdateNestedManyWithout\w+Input$/,
      /^(\w+)UpsertNestedOneWithout\w+Input$/,
      /^(\w+)UpsertNestedManyWithout\w+Input$/,
      /^(\w+)CreateOrConnectWithout\w+Input$/,
      /^(\w+)UpdateOneRequiredWithout\w+NestedInput$/,
      /^(\w+)UpdateToOneWithWhereWithout\w+Input$/,
      /^(\w+)UpsertWithout\w+Input$/,
      /^(\w+)CreateWithout\w+Input$/,
      /^(\w+)UpdateWithout\w+Input$/,
      /^(\w+)UncheckedCreateWithout\w+Input$/,
      /^(\w+)UncheckedUpdateWithout\w+Input$/,
      /^(\w+)UncheckedCreateNestedManyWithout\w+Input$/,
      /^(\w+)UncheckedUpdateManyWithout\w+Input$/,
      /^(\w+)UncheckedUpdateManyWithout\w+NestedInput$/,

      // Many-to-many relation inputs
      /^(\w+)CreateManyAuthorInput$/,
      /^(\w+)CreateManyAuthorInputEnvelope$/,
      /^(\w+)UpdateManyWithWhereWithout\w+Input$/,
      /^(\w+)UpdateWithWhereUniqueWithout\w+Input$/,
      /^(\w+)UpsertWithWhereUniqueWithout\w+Input$/,
      /^(\w+)UpdateManyWithout\w+NestedInput$/,

      // Additional specific patterns found in generated schemas
      /^(\w+)ScalarWhereInput$/,
      /^(\w+)UncheckedUpdateManyInput$/,

      // Args and other schemas
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
    if (
      schemaName.includes('Create') ||
      schemaName.includes('Update') ||
      schemaName.includes('Where')
    ) {
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
  static logFieldFiltering(
    originalCount: number,
    filteredCount: number,
    modelName?: string,
    variant?: string,
  ): void {
    if (originalCount !== filteredCount) {
      const context = modelName ? `${modelName}${variant ? ` (${variant})` : ''}` : 'schema';
      logger.debug(
        `   🎯 ${context}: filtered ${originalCount - filteredCount} fields (${filteredCount}/${originalCount} remaining)`,
      );
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
    return fields.filter((field) => {
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
    const config = this.getGeneratorConfig();
    if (config?.mode === 'minimal') return false;
    return Transformer.isGenerateInclude && this.checkModelHasEnabledModelRelation(model);
  }

  /**
   * Check if a model should have select schemas generated
   */
  static shouldGenerateSelectSchema(_model: PrismaDMMF.Model): boolean {
    const config = this.getGeneratorConfig();
    if (config?.mode === 'minimal') return false;
    return Transformer.isGenerateSelect;
  }

  /**
   * Log relationship preservation information
   */
  static logRelationshipPreservation(model: PrismaDMMF.Model): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledRelatedModels = this.getEnabledRelatedModels(model);
    const totalRelationFields = model.fields.filter(
      (f) => f.kind === 'object' && f.relationName,
    ).length;
    const enabledRelationFields = model.fields.filter((f) => this.isEnabledRelationField(f)).length;

    if (totalRelationFields > enabledRelationFields) {
      const disabledRelations = totalRelationFields - enabledRelationFields;
      logger.debug(
        `   🔗 ${model.name}: ${disabledRelations} disabled relation(s) to filtered models`,
      );
    }

    if (enabledRelatedModels.length > 0) {
      logger.debug(`   ✅ ${model.name}: active relations to [${enabledRelatedModels.join(', ')}]`);
    }
  }
  // Dual export setters
  static setExportTypedSchemas(exportTypedSchemas: boolean) {
    this.exportTypedSchemas = exportTypedSchemas;
  }

  static setExportZodSchemas(exportZodSchemas: boolean) {
    this.exportZodSchemas = exportZodSchemas;
  }

  static setTypedSchemaSuffix(typedSchemaSuffix: string) {
    this.typedSchemaSuffix = typedSchemaSuffix;
  }

  static setZodSchemaSuffix(zodSchemaSuffix: string) {
    this.zodSchemaSuffix = zodSchemaSuffix;
  }

  static getOutputPath() {
    return this.outputPath;
  }

  static setPrismaClientOutputPath(prismaClientCustomPath: string) {
    this.prismaClientOutputPath = prismaClientCustomPath;
    this.isCustomPrismaClientOutputPath = prismaClientCustomPath !== '@prisma/client';
  }

  /**
   * Resolve the import specifier for Prisma Client relative to a target directory.
   * Falls back to '@prisma/client' when user did not configure a custom output.
   */
  private static resolvePrismaImportPath(targetDir: string): string {
    if (!this.isCustomPrismaClientOutputPath) return '@prisma/client';
    try {
      // Compute relative path from the file's directory to the custom client output path
      let rel = path.relative(targetDir, this.prismaClientOutputPath).replace(/\\/g, '/');
      if (!rel || rel === '') return '@prisma/client';

      // For the new Prisma generator (provider = 'prisma-client'), the public entrypoint
      // that re-exports the Prisma namespace is the generated 'client' module.
      // Importing the directory itself won't resolve (no index), so ensure '/client' suffix.
      if (this.prismaClientProvider === 'prisma-client') {
        // Avoid double-appending if already targeting 'client'
        if (!/\/?client\/?$/.test(rel)) {
          rel = `${rel.replace(/\/$/, '')}/client`;
        }
      }

      // Ensure it is a valid relative module specifier (prefix with ./ when needed)
      if (rel.startsWith('.') || rel.startsWith('/')) return rel;
      return `./${rel}`;
    } catch {
      return '@prisma/client';
    }
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
  static getSchemasPath(): string {
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

      // Filter out enum schemas for disabled models
      if (this.isEnumSchemaEnabled(name)) {
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `enums/${name}.schema.ts`),
          `${this.generateImportZodStatement()}\n${this.generateExportSchemaStatement(
            `${name}`,
            // Use single-quoted values for enum array representation to match tests
            `z.enum([${values.map((v) => `'${v}'`).join(', ')}])`,
          )}`,
        );
      }
    }
  }

  /**
   * Check if an enum schema should be generated based on enabled models
   */
  private isEnumSchemaEnabled(enumName: string): boolean {
    // Extract model name from enum names like "PostScalarFieldEnum" -> "Post"
    const modelName = this.extractModelNameFromEnum(enumName);

    if (modelName) {
      return Transformer.isModelEnabled(modelName);
    }

    // If we can't determine the model, generate the enum (default behavior)
    return true;
  }

  /**
   * Extract model name from enum name
   */
  private extractModelNameFromEnum(enumName: string): string | null {
    const patterns = [/^(\w+)ScalarFieldEnum$/, /^(\w+)OrderByRelevanceFieldEnum$/];

    for (const pattern of patterns) {
      const match = enumName.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
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
      path.join(Transformer.getSchemasPath(), `objects/${objectSchemaName}.schema.ts`),
      objectSchema,
    );
  }

  generateObjectSchemaFields() {
    // Determine context for field filtering
    const modelName = Transformer.extractModelNameFromContext(this.name);
    const variant = Transformer.determineSchemaVariant(this.name);

    // Debug: Log the raw context name and extracted model name
    logger.debug(`🔍 Schema context: "${this.name}" -> extracted model: "${modelName}"`);

    // Apply field filtering
    const originalFieldCount = this.fields.length;
    const filteredFields = Transformer.filterFields(
      this.fields,
      modelName || undefined,
      variant,
      this.models,
      this.name,
    );
    // Compute excluded field names for this schema context
    const excluded = this.fields
      .filter((orig) => !filteredFields.some((f) => f.name === orig.name))
      .map((f) => f.name);
    this.lastExcludedFieldNames = excluded.length > 0 ? excluded : [];

    // Log field filtering if any fields were excluded
    Transformer.logFieldFiltering(
      originalFieldCount,
      filteredFields.length,
      modelName || undefined,
      variant,
    );

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
        result.push(this.wrapWithZodValidators('z.boolean()', field, inputType));
      } else if (inputType.type === 'Int') {
        result.push(this.wrapWithZodValidators('z.number().int()', field, inputType));
      } else if (inputType.type === 'Float' || inputType.type === 'Decimal') {
        result.push(this.wrapWithZodValidators('z.number()', field, inputType));
      } else if (inputType.type === 'BigInt') {
        result.push(this.wrapWithZodValidators('z.bigint()', field, inputType));
      } else if (inputType.type === 'Boolean') {
        result.push(this.wrapWithZodValidators('z.boolean()', field, inputType));
      } else if (inputType.type === 'DateTime') {
        // Apply configurable DateTime strategy
        const cfg = Transformer.getGeneratorConfig();
        let dateExpr = 'z.date()';
        if (cfg?.dateTimeStrategy === 'coerce') {
          dateExpr = 'z.coerce.date()';
        } else if (cfg?.dateTimeStrategy === 'isoString') {
          // ISO string validated then transformed to Date
          dateExpr =
            'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/, "Invalid ISO datetime").transform(v => new Date(v))';
        }
        result.push(this.wrapWithZodValidators(dateExpr, field, inputType));
      } else if (inputType.type === 'Json') {
        this.hasJson = true;

        result.push(this.wrapWithZodValidators('jsonSchema', field, inputType));
      } else if (inputType.type === 'True') {
        result.push(this.wrapWithZodValidators('z.literal(true)', field, inputType));
      } else if (inputType.type === 'Bytes') {
        result.push(this.wrapWithZodValidators('z.instanceof(Uint8Array)', field, inputType));
      } else {
        const isEnum = inputType.location === 'enumTypes';

        if (inputType.namespace === 'prisma' || isEnum) {
          if (inputType.type !== this.name && typeof inputType.type === 'string') {
            this.addSchemaImport(inputType.type);
          }

          result.push(this.generatePrismaStringLine(field, inputType, lines.length));
        }
      }

      return result;
    }, []);

    if (alternatives.length === 0) {
      return [];
    }

    if (alternatives.length > 1) {
      alternatives = alternatives.map((alter) => alter.replace('.optional()', ''));
    }

    // Check if ALL alternatives already include the field name
    // This happens when inputsLength === 1 for all alternatives
    // We check if alternatives start with the field name pattern (spaces + fieldname + colon)
    const fieldNamePattern = `  ${field.name}:`;
    const allAlternativesHaveFieldName = alternatives.every((alt) =>
      alt.startsWith(fieldNamePattern),
    );

    const fieldName = allAlternativesHaveFieldName ? '' : fieldNamePattern;

    // Base optional marker; will be normalized below based on config/nullable
    const opt = !field.isRequired ? '.optional()' : '';

    let resString =
      alternatives.length === 1
        ? alternatives.join(', ')
        : `z.union([${alternatives.join(', ')}])${opt}`;

    // Normalize optional/nullable behavior based on configuration
    const config = Transformer.getGeneratorConfig();
    const optionalFieldBehavior = config?.optionalFieldBehavior || 'nullish';
    if (!field.isRequired) {
      // Field is optional
      // First, strip any existing .optional() added earlier; we'll re-apply below
      resString = resString.replace('.optional()', '');
      if (field.isNullable) {
        // Optional + nullable → follow configured behavior
        if (optionalFieldBehavior === 'nullish') resString += '.nullish()';
        else if (optionalFieldBehavior === 'optional') resString += '.optional()';
        else resString += '.nullable()';
      } else {
        // Optional only (not nullable)
        if (optionalFieldBehavior === 'nullable') {
          // For non-nullable optional fields, .nullable() would change type; keep .optional()
          resString += '.optional()';
        } else if (optionalFieldBehavior === 'nullish') {
          // Non-nullable optional → nullish would accept null; avoid widening; keep .optional()
          resString += '.optional()';
        } else {
          resString += '.optional()';
        }
      }
    } else if (field.isNullable) {
      // Required but nullable
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

    // Apply native type constraints (e.g., @db.VarChar(255) -> .max(255))
    // Only for String types and only if no enhanced Zod schema is already applied
    if (inputType.type === 'String' && field.name) {
      const nativeMaxLength = this.extractMaxLengthFromNativeType(field);
      const existingMaxConstraint = hasEnhancedZodSchema
        ? this.extractExistingMaxConstraint(line)
        : null;

      if (nativeMaxLength !== null) {
        if (hasEnhancedZodSchema && existingMaxConstraint !== null) {
          // Both native type and @zod.max exist - use the more restrictive one
          const finalMaxLength = Math.min(nativeMaxLength, existingMaxConstraint);

          // Always replace all max constraints with the single most restrictive one
          line = this.replaceAllMaxConstraints(line, finalMaxLength);
        } else if (!hasEnhancedZodSchema) {
          // Only native type constraint exists - apply it to the base validator
          line = line.replace('z.string()', `z.string().max(${nativeMaxLength})`);
        } else if (hasEnhancedZodSchema && existingMaxConstraint === null) {
          // Enhanced @zod schema exists but no max constraint - add native constraint
          // Find the base type and add max constraint after it
          if (line.includes('z.string()')) {
            line = line.replace('z.string()', `z.string().max(${nativeMaxLength})`);
          } else {
            // Handle cases where the string type is already transformed
            const baseStringMatch = line.match(/(z\.string\(\)[^.]*)/);
            if (baseStringMatch) {
              line = line.replace(
                baseStringMatch[1],
                `${baseStringMatch[1]}.max(${nativeMaxLength})`,
              );
            }
          }
        }
      }
    }

    if (inputType.isList) {
      if (inputType.type === 'DateTime') {
        // For DateTime lists, support both Date and ISO datetime arrays
        line = 'z.union([z.date().array(), z.iso.datetime().array()])';
      } else {
        // Append array() only once to avoid duplication
        if (!line.includes('.array()')) {
          line += '.array()';
        }
      }
    }

    // Handle optionality correctly - add .optional() before any validations if field is optional
    if (!field.isRequired) {
      if (hasEnhancedZodSchema) {
        // For enhanced schemas, check if optionality is already handled
        if (!line.includes('.optional()') && !line.includes('.nullable()')) {
          // Extract base type and validations, then reorder
          const baseTypeMatch = line.match(/^(z\.[^.]+(?:\(\))?)/);
          const validationsMatch = line.match(/(\.[^.]+(?:\([^)]*\))?)+$/);

          if (baseTypeMatch && validationsMatch) {
            const baseType = baseTypeMatch[1];
            const validations = validationsMatch[0];
            line = `${baseType}${validations}.optional()`;
          } else {
            line += '.optional()';
          }
        }
      } else {
        line += '.optional()';
      }
    }

    // Final safety: collapse any accidental duplicate array() chaining (e.g., .array().array())
    line = line.replace(/(\.array\(\))+$/, '.array()');

    return line;
  }

  addSchemaImport(name: string) {
    this.schemaImports.add(name);
  }

  /**
   * Extract max length constraint from native type (e.g., @db.VarChar(255) -> 255)
   */
  private extractMaxLengthFromNativeType(field: PrismaDMMF.SchemaArg): number | null {
    // Check if the field has the enhanced field information with native type
    if (!this.enhancedModels || !field.name) {
      return null;
    }

    // Extract model name from the current transformer context
    const modelName = Transformer.extractModelNameFromContext(this.name);
    if (!modelName) {
      return null;
    }

    // Find the enhanced model information
    const enhancedModel = this.enhancedModels.find((em) => em.model.name === modelName);
    if (!enhancedModel) {
      return null;
    }

    // Find the enhanced field information
    const enhancedField = enhancedModel.enhancedFields.find((ef) => ef.field.name === field.name);
    if (!enhancedField || !enhancedField.field.nativeType) {
      return null;
    }

    const nativeType = enhancedField.field.nativeType;

    // nativeType is an array: [typeName, [param1, param2, ...]]
    if (!Array.isArray(nativeType) || nativeType.length < 2) {
      return null;
    }

    const [typeName, params] = nativeType;

    // Handle string length constraints for various native types
    if (typeof typeName === 'string') {
      // SQL database string types with explicit length parameters
      if (Array.isArray(params) && params.length > 0) {
        const supportedTypes = ['VarChar', 'Char', 'NVarChar', 'NChar', 'VARCHAR', 'CHAR'];

        if (supportedTypes.includes(typeName)) {
          const lengthParam = params[0];
          const maxLength = parseInt(lengthParam, 10);

          if (!isNaN(maxLength) && maxLength > 0) {
            return maxLength;
          }
        }
      }

      // MongoDB ObjectId has a fixed length (24 hex characters)
      if (typeName === 'ObjectId') {
        return 24;
      }
    }

    return null;
  }

  /**
   * Extract existing max constraint from @zod validations
   */
  private extractExistingMaxConstraint(zodValidation: string | null): number | null {
    if (!zodValidation) {
      return null;
    }

    // Look for all .max(number) in the validation string and return the most restrictive
    const maxMatches = zodValidation.match(/\.max\((\d+)\)/g);
    if (maxMatches && maxMatches.length > 0) {
      let minMax = Infinity;

      for (const match of maxMatches) {
        const valueMatch = match.match(/\.max\((\d+)\)/);
        if (valueMatch) {
          const maxValue = parseInt(valueMatch[1], 10);
          if (!isNaN(maxValue) && maxValue > 0) {
            minMax = Math.min(minMax, maxValue);
          }
        }
      }

      return minMax === Infinity ? null : minMax;
    }

    return null;
  }

  /**
   * Replace all max constraints in a validation string with a single constraint
   */
  private replaceAllMaxConstraints(validationString: string, newMaxValue: number): string {
    // Remove all existing .max(number) constraints
    const withoutMax = validationString.replace(/\.max\(\d+\)/g, '');

    // Add the new max constraint after z.string()
    if (withoutMax.includes('z.string()')) {
      return withoutMax.replace('z.string()', `z.string().max(${newMaxValue})`);
    } else {
      // Handle cases where string type is already transformed - add after the base type
      const baseStringMatch = withoutMax.match(/(z\.string\(\)[^.]*)/);
      if (baseStringMatch) {
        return withoutMax.replace(baseStringMatch[1], `${baseStringMatch[1]}.max(${newMaxValue})`);
      }
    }

    return withoutMax;
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
    const enhancedModel = this.enhancedModels.find((em) => em.model.name === modelName);
    if (!enhancedModel) {
      return null;
    }

    // Find the enhanced field information
    const enhancedField = enhancedModel.enhancedFields.find((ef) => ef.field.name === fieldName);
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
          return `z.enum(${field.type})`;
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

    const { isModelQueryType, modelName, queryName } = this.checkIsModelQueryType(
      inputType.type as string,
    );

    const objectSchemaLine = isModelQueryType
      ? this.resolveModelQuerySchemaName(modelName as string, queryName as string)
      : `${inputType.type}ObjectSchema`;
    const enumSchemaLine = `${inputType.type}Schema`;

    const schema =
      inputType.type === this.name ? objectSchemaLine : isEnum ? enumSchemaLine : objectSchemaLine;

    const arr = inputType.isList ? '.array()' : '';

    const opt = !field.isRequired ? '.optional()' : '';

    // Only use lazy loading for self-references or complex object schemas that might have circular dependencies
    // Simple enums like SortOrder don't need lazy loading
    const needsLazyLoading =
      inputType.type === this.name || (!isEnum && inputType.namespace === 'prisma');

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

  generateFieldValidators(zodStringWithMainType: string, field: PrismaDMMF.SchemaArg) {
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
    const baseImports = this.generateObjectSchemaImportStatements();
    let jsonImport = '';
    if (this.hasJson) {
      const cfg = Transformer.getGeneratorConfig();
      const isMinimal = cfg?.mode === 'minimal';
      if (isMinimal) {
        // Inline lightweight json helpers per file (cheaper in minimal mode, files are separate)
        jsonImport = `\nconst literalSchema = z.union([z.string(), z.number(), z.boolean()]);\nconst jsonSchema: any = z.lazy(() =>\n  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(z.string(), jsonSchema.nullable())])\n);\n\n`;
      } else {
        Transformer.ensureJsonHelpersFile();
        jsonImport = `import { JsonValueSchema as jsonSchema } from './helpers/json-helpers';\n\n`;
      }
    }
    return `${baseImports}${jsonImport}${objectSchema}`;
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
    // Build dual exports: a typed Prisma-bound schema and a pure Zod schema
    // Always export the typed name as `${exportName}ObjectSchema` for compatibility
    const lines: string[] = [];

    const supportsPrismaType = !name.endsWith('Args');

    if (Transformer.exportTypedSchemas) {
      if (supportsPrismaType) {
        // Determine correct Prisma type binding (some inputs use a *Type suffix)
        let prismaType = this.resolvePrismaTypeForObject(exportName);
        // Optionally wrap with Omit<> when strictCreateInputs=false and fields were excluded on Create-like inputs
        const config = (Transformer.getGeneratorConfig() || {}) as GeneratorConfig;
        const strictCreateInputs = config.strictCreateInputs !== false; // default true
        const isInputVariant = Transformer.determineSchemaVariant(name) === 'input';
        const isCreateLike = [
          /^(\w+)CreateInput$/,
          /^(\w+)UncheckedCreateInput$/,
          /^(\w+)CreateManyInput$/,
          /^(\w+)CreateMany\w+Input$/,
          /^(\w+)CreateWithout\w+Input$/,
          /^(\w+)UncheckedCreateWithout\w+Input$/,
          /^(\w+)CreateOrConnectWithout\w+Input$/,
          /^(\w+)CreateNested(?:One|Many)Without\w+Input$/,
        ].some((re) => re.test(exportName));
        const excludedNames = this.lastExcludedFieldNames || [];
        if (
          !strictCreateInputs &&
          isInputVariant &&
          isCreateLike &&
          excludedNames.length > 0 &&
          prismaType
        ) {
          const union = excludedNames.map((n) => `'${n}'`).join(' | ');
          prismaType = `Omit<${prismaType}, ${union}>`;
        }
        if (prismaType) {
          lines.push(
            `export const ${exportName}ObjectSchema: z.ZodType<${prismaType}, ${prismaType}> = ${schema};`,
          );
        } else {
          // Fallback to untyped if we cannot resolve a safe Prisma type
          lines.push(`export const ${exportName}ObjectSchema = ${schema};`);
        }
      } else {
        // Args-like types may not exist on Prisma namespace; export untyped for compatibility
        lines.push(`export const ${exportName}ObjectSchema = ${schema};`);
      }
    }

    if (Transformer.exportZodSchemas) {
      const zodName = `${exportName}Object${Transformer.zodSchemaSuffix}`;
      lines.push(`export const ${zodName} = ${schema};`);
    }

    // Fallback: if neither flag produced output, emit a basic (untyped) export
    if (lines.length === 0) {
      lines.push(`export const ${exportName}ObjectSchema = ${schema};`);
    }

    return lines.join('\n');
  }

  /**
   * Resolve the appropriate Prisma type identifier for an object schema export.
   * In Prisma 6, certain aggregate input types are exported with a `Type` suffix.
   * Example: Prisma.PlanetCountAggregateInputType instead of Prisma.PlanetCountAggregateInput
   */
  private resolvePrismaTypeForObject(exportName: string): string | null {
    // No Prisma types for generic Args wrappers here
    if (exportName.endsWith('Args')) return null;

    // Handle aggregate input objects that use the `Type` suffix
    if (/(Count|Min|Max|Avg|Sum)AggregateInput$/.test(exportName)) {
      return `Prisma.${exportName}Type`;
    }

    // Default mapping: Prisma.<ExportName>
    return `Prisma.${exportName}`;
  }

  addFinalWrappers({ zodStringFields }: { zodStringFields: string[] }) {
    const fields = [...zodStringFields];

    return this.wrapWithZodObject(fields) + '.strict()';
  }

  // Legacy method retained for backward compatibility; now returns empty string.
  generateJsonSchemaImplementation() {
    return '';
  }

  private static async writeJsonHelpersFile(targetPath: string) {
    const fs = await import('fs');
    const pathMod = await import('path');
    const helpersDir = pathMod.join(targetPath, 'helpers');
    await fs.promises.mkdir(helpersDir, { recursive: true });
    const filePath = pathMod.join(helpersDir, 'json-helpers.ts');
    // Source content mirrors src/helpers/json-helpers.ts (keep in sync manually)
    const content = `import { z } from 'zod';\n\nexport type JsonPrimitive = string | number | boolean | null;\nexport type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };\nexport type InputJsonValue = JsonPrimitive | InputJsonValue[] | { [k: string]: InputJsonValue | null };\nexport type NullableJsonInput = JsonValue | 'JsonNull' | 'DbNull' | null;\nexport const transformJsonNull = (v?: NullableJsonInput) => {\n  if (v == null || v === 'DbNull') return null;\n  if (v === 'JsonNull') return null;\n  return v as JsonValue;\n};\nexport const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>\n  z.union([\n    z.string(), z.number(), z.boolean(), z.literal(null),\n    z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),\n    z.array(z.lazy(() => JsonValueSchema)),\n  ])\n) as z.ZodType<JsonValue>;\nexport const InputJsonValueSchema: z.ZodType<InputJsonValue> = z.lazy(() =>\n  z.union([\n    z.string(), z.number(), z.boolean(),\n    z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),\n    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),\n  ])\n) as z.ZodType<InputJsonValue>;\nexport const NullableJsonValue = z\n  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull'), z.literal(null)])\n  .transform((v) => transformJsonNull(v as NullableJsonInput));\n`;
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  private static ensureJsonHelpersFile() {
    if (this.jsonHelpersWritten) return;
    this.jsonHelpersWritten = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fallback sync write path for environments without top-level await
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pathMod = require('path');
      const helpersDir = pathMod.join(this.outputPath, 'helpers');
      fs.mkdirSync(helpersDir, { recursive: true });
      const filePath = pathMod.join(helpersDir, 'json-helpers.ts');
      const content = `import { z } from 'zod';\n\nexport type JsonPrimitive = string | number | boolean | null;\nexport type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };\nexport type InputJsonValue = JsonPrimitive | InputJsonValue[] | { [k: string]: InputJsonValue | null };\nexport type NullableJsonInput = JsonValue | 'JsonNull' | 'DbNull' | null;\nexport const transformJsonNull = (v?: NullableJsonInput) => {\n  if (v == null || v === 'DbNull') return null;\n  if (v === 'JsonNull') return null;\n  return v as JsonValue;\n};\nexport const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>\n  z.union([\n    z.string(), z.number(), z.boolean(), z.literal(null),\n    z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),\n    z.array(z.lazy(() => JsonValueSchema)),\n  ])\n) as z.ZodType<JsonValue>;\nexport const InputJsonValueSchema: z.ZodType<InputJsonValue> = z.lazy(() =>\n  z.union([\n    z.string(), z.number(), z.boolean(),\n    z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),\n    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),\n  ])\n) as z.ZodType<InputJsonValue>;\nexport const NullableJsonValue = z\n  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull'), z.literal(null)])\n  .transform((v) => transformJsonNull(v as NullableJsonInput));\n`;
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (e) {
      logger.warn(`Failed to write json helpers: ${e}`);
    }
  }

  generateObjectSchemaImportStatements() {
    let generatedImports = this.generateImportZodStatement();
    // Ensure Prisma types import exists for type safety checks in tests
    // Object schemas live under .../schemas/objects so compute path from that directory.
    const objectsDir = path.join(Transformer.getSchemasPath(), 'objects');
    const prismaImportPath = Transformer.resolvePrismaImportPath(objectsDir);
    generatedImports += `import type { Prisma } from '${prismaImportPath}';\n`;
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
    const isNewPrismaClientGenerator =
      Transformer.prismaClientProvider === 'prisma-client' ||
      Transformer.prismaClientConfig.moduleFormat !== undefined ||
      Transformer.prismaClientConfig.runtime !== undefined;

    // If using ESM with importFileExtension specified, use that extension
    if (
      isNewPrismaClientGenerator &&
      Transformer.prismaClientConfig.moduleFormat === 'esm' &&
      Transformer.prismaClientConfig.importFileExtension
    ) {
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
  static generateValidatedImportStatement(
    importName: string,
    importPath: string,
    modelName?: string,
  ): string {
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
    const isNewPrismaClientGenerator =
      this.prismaClientProvider === 'prisma-client' ||
      this.prismaClientConfig.moduleFormat !== undefined ||
      this.prismaClientConfig.runtime !== undefined;
    if (
      isNewPrismaClientGenerator &&
      this.prismaClientConfig.moduleFormat === 'esm' &&
      this.prismaClientConfig.importFileExtension
    ) {
      return `.${this.prismaClientConfig.importFileExtension}`;
    }
    return '';
  }

  generateSchemaImports() {
    // Get the file extension to use for imports (for ESM support)
    const importExtension = this.getImportFileExtension();

    return [...this.schemaImports]
      .map((name) => {
        const { isModelQueryType, modelName, queryName } = this.checkIsModelQueryType(name);
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
    const modelNameCapitalized = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const queryNameCapitalized = queryName.charAt(0).toUpperCase() + (queryName as string).slice(1);
    return `${modelNameCapitalized}${queryNameCapitalized}Schema`;
  }

  wrapWithZodObject(zodStringFields: string | string[]) {
    let wrapped = '';
    const fieldsText = Array.isArray(zodStringFields)
      ? zodStringFields.filter(Boolean).join(',\n  ')
      : zodStringFields;

    wrapped += 'z.object({';
    wrapped += '\n';
    wrapped += '  ' + fieldsText;
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
    const cfg = Transformer.getGeneratorConfig();
    if (cfg?.emit && cfg.emit.crud === false) {
      logger.debug('⏭️  emit.crud=false (skipping all CRUD operation schema generation)');
      return;
    }
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
        findUnique,
        findFirst,
        findMany,
        createOne,
        createMany,
        deleteOne,
        deleteMany,
        updateOne,
        updateMany,
        upsertOne,
        aggregate,
        groupBy,
        'count',
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
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findUnique}.schema.ts`),
          `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
            `${modelName}FindUnique`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema })`,
          )}`,
        );
      }

      // Generate findUniqueOrThrow schema (same as findUnique but with error-throwing behavior)
      if (Transformer.isOperationEnabled(modelName, 'findUniqueOrThrow')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `findUniqueOrThrow${modelName}.schema.ts`),
          `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
            `${modelName}FindUniqueOrThrow`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema })`,
          )}`,
        );
      }

      if (findFirst && Transformer.isOperationEnabled(modelName, 'findFirst')) {
        const shouldInline = this.shouldInlineSelectSchema(model);

        // Build imports based on aggressive inlining strategy
        const baseImports = [
          includeImport, // Include always external
          orderByImport,
          this.generateImportStatement(
            `${modelName}WhereInputObjectSchema`,
            `./objects/${modelName}WhereInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}ScalarFieldEnumSchema`,
            `./enums/${modelName}ScalarFieldEnum.schema`,
          ),
        ];

        // Add select import only if NOT inlining, add inline imports if inlining
        const imports = shouldInline
          ? [...baseImports, ...this.generateInlineSelectImports(model)]
          : [...baseImports, selectImport];

        // Determine select field reference based on dual export strategy
        const selectFieldReference = shouldInline
          ? Transformer.exportTypedSchemas
            ? `${modelName}FindFirstSelect${Transformer.typedSchemaSuffix}.optional()`
            : `${modelName}FindFirstSelect${Transformer.zodSchemaSuffix}.optional()`
          : selectZodSchemaLineLazy.replace('select: ', '').replace(',', '');

        const selectField = `select: ${selectFieldReference},`;
        const includeField = includeZodSchemaLineLazy; // Include always uses lazy loading
        const schemaFields =
          `${selectField} ${includeField} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([${modelName}ScalarFieldEnumSchema, ${modelName}ScalarFieldEnumSchema.array()]).optional()`
            .trim()
            .replace(/,\s*,/g, ',');

        // Add Prisma type import for explicit type binding
        const crudDir = Transformer.getSchemasPath();
        const prismaImportPath = Transformer.resolvePrismaImportPath(crudDir);
        let schemaContent = `import type { Prisma } from '${prismaImportPath}';\n${this.generateImportStatements(imports)}`;

        // Add inline select schema definitions (dual export pattern)
        if (shouldInline) {
          schemaContent += `// Select schema needs to be in file to prevent circular imports\n//------------------------------------------------------\n\n${this.generateDualSelectSchemaExports(model, 'FindFirst')}\n\n`;
        }

        // Generate dual schema exports for FindFirst operation
        const schemaObjectDefinition = `z.object({ ${schemaFields} }).strict()`;
        const dualExports = this.generateDualSchemaExports(
          modelName,
          'FindFirst',
          schemaObjectDefinition,
          `Prisma.${modelName}FindFirstArgs`,
        );

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findFirst}.schema.ts`),
          schemaContent + dualExports,
        );
      }

      // Generate findFirstOrThrow schema (same as findFirst but with error-throwing behavior)
      if (Transformer.isOperationEnabled(modelName, 'findFirstOrThrow')) {
        const shouldInline = this.shouldInlineSelectSchema(model);

        // Build imports based on aggressive inlining strategy
        const baseImports = [
          includeImport, // Include always external
          orderByImport,
          this.generateImportStatement(
            `${modelName}WhereInputObjectSchema`,
            `./objects/${modelName}WhereInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}ScalarFieldEnumSchema`,
            `./enums/${modelName}ScalarFieldEnum.schema`,
          ),
        ];

        // Add select import only if NOT inlining, add inline imports if inlining
        const imports = shouldInline
          ? [...baseImports, ...this.generateInlineSelectImports(model)]
          : [...baseImports, selectImport];
        // Determine select field reference based on dual export strategy
        const selectFieldReference = shouldInline
          ? Transformer.exportTypedSchemas
            ? `${modelName}FindFirstOrThrowSelect${Transformer.typedSchemaSuffix}.optional()`
            : `${modelName}FindFirstOrThrowSelect${Transformer.zodSchemaSuffix}.optional()`
          : selectZodSchemaLineLazy.replace('select: ', '').replace(',', '');

        const selectField = `select: ${selectFieldReference},`;
        const includeField = includeZodSchemaLineLazy; // Include always uses lazy loading
        const schemaFields =
          `${selectField} ${includeField} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([${modelName}ScalarFieldEnumSchema, ${modelName}ScalarFieldEnumSchema.array()]).optional()`
            .trim()
            .replace(/,\s*,/g, ',');

        // Add Prisma type import for explicit type binding
        const crudDir = Transformer.getSchemasPath();
        const prismaImportPath = Transformer.resolvePrismaImportPath(crudDir);
        let schemaContent = `import type { Prisma } from '${prismaImportPath}';\n${this.generateImportStatements(imports)}`;

        // Add inline select schema definitions (dual export pattern)
        if (shouldInline) {
          schemaContent += `// Select schema needs to be in file to prevent circular imports\n//------------------------------------------------------\n\n${this.generateDualSelectSchemaExports(model, 'FindFirstOrThrow')}\n\n`;
        }

        const schemaObjectDefinition = `z.object({ ${schemaFields} }).strict()`;
        const dualExports = this.generateDualSchemaExports(
          modelName,
          'FindFirstOrThrow',
          schemaObjectDefinition,
          `Prisma.${modelName}FindFirstOrThrowArgs`,
        );
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `findFirstOrThrow${modelName}.schema.ts`),
          schemaContent + dualExports,
        );
      }

      if (findMany && Transformer.isOperationEnabled(modelName, 'findMany')) {
        const shouldInline = this.shouldInlineSelectSchema(model);

        // Build imports based on aggressive inlining strategy
        const baseImports = [
          includeImport, // Include always external
          orderByImport,
          this.generateImportStatement(
            `${modelName}WhereInputObjectSchema`,
            `./objects/${modelName}WhereInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}ScalarFieldEnumSchema`,
            `./enums/${modelName}ScalarFieldEnum.schema`,
          ),
        ];

        // Add select import only if NOT inlining, add inline imports if inlining
        const imports = shouldInline
          ? [...baseImports, ...this.generateInlineSelectImports(model)]
          : [...baseImports, selectImport];

        // Determine select field reference based on dual export strategy
        const selectFieldReference = shouldInline
          ? Transformer.exportTypedSchemas
            ? `${modelName}FindManySelect${Transformer.typedSchemaSuffix}.optional()`
            : `${modelName}FindManySelect${Transformer.zodSchemaSuffix}.optional()`
          : selectZodSchemaLineLazy.replace('select: ', '').replace(',', '');

        const selectField = `select: ${selectFieldReference},`;
        const includeField = includeZodSchemaLineLazy; // Include always uses lazy loading
        const schemaFields =
          `${selectField} ${includeField} ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), distinct: z.union([${modelName}ScalarFieldEnumSchema, ${modelName}ScalarFieldEnumSchema.array()]).optional()`
            .trim()
            .replace(/,\s*,/g, ',');

        // Add Prisma type import for explicit type binding
        const crudDir2 = Transformer.getSchemasPath();
        const prismaImportPath = Transformer.resolvePrismaImportPath(crudDir2);
        let schemaContent = `import type { Prisma } from '${prismaImportPath}';\n${this.generateImportStatements(imports)}`;

        // Add inline select schema definitions (dual export pattern)
        if (shouldInline) {
          schemaContent += `// Select schema needs to be in file to prevent circular imports\n//------------------------------------------------------\n\n${this.generateDualSelectSchemaExports(model, 'FindMany')}\n\n`;
        }

        // Generate dual schema exports for FindMany operation
        const schemaObjectDefinition = `z.object({ ${schemaFields} }).strict()`;
        const dualExports = this.generateDualSchemaExports(
          modelName,
          'FindMany',
          schemaObjectDefinition,
          `Prisma.${modelName}FindManyArgs`,
        );

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${findMany}.schema.ts`),
          schemaContent + dualExports,
        );
      }

      // Generate count schema aligned with Prisma <Model>CountArgs
      if (Transformer.isOperationEnabled(modelName, 'count')) {
        // Build imports
        const imports = [
          orderByImport,
          this.generateImportStatement(
            `${modelName}WhereInputObjectSchema`,
            `./objects/${modelName}WhereInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}CountAggregateInputObjectSchema`,
            `./objects/${modelName}CountAggregateInput.schema`,
          ),
        ];

        // Add Prisma type import for explicit type binding
        const crudDirCount = Transformer.getSchemasPath();
        const prismaImportPathCount = Transformer.resolvePrismaImportPath(crudDirCount);
        const schemaContent = `import type { Prisma } from '${prismaImportPathCount}';\n${this.generateImportStatements(imports)}`;

        const countSchemaObject = `z.object({ ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), select: z.union([ z.literal(true), ${modelName}CountAggregateInputObjectSchema ]).optional() }).strict()`;

        const dualExports = this.generateDualSchemaExports(
          modelName,
          'Count',
          countSchemaObject,
          `Prisma.${modelName}CountArgs`,
        );

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `count${modelName}.schema.ts`),
          schemaContent + dualExports,
        );
      }

      if (createOne && Transformer.isOperationEnabled(modelName, 'createOne')) {
        const imports = [
          selectImport,
          includeImport,
          this.generateImportStatement(
            `${modelName}CreateInputObjectSchema`,
            `./objects/${modelName}CreateInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}UncheckedCreateInputObjectSchema`,
            `./objects/${modelName}UncheckedCreateInput.schema`,
          ),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${createOne}.schema.ts`),
          `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
            `${modelName}CreateOne`,
            `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}CreateInputObjectSchema, ${modelName}UncheckedCreateInputObjectSchema])  })`,
          )}`,
        );
      }

      if (createMany && Transformer.isOperationEnabled(modelName, 'createMany')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          logger.debug(`⏭️  Minimal mode: skipping ${modelName}.createMany`);
        } else {
          const imports = [
            this.generateImportStatement(
              `${modelName}CreateManyInputObjectSchema`,
              `./objects/${modelName}CreateManyInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `${createMany}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}CreateMany`,
              `z.object({ data: z.union([ ${modelName}CreateManyInputObjectSchema, z.array(${modelName}CreateManyInputObjectSchema) ]), ${
                Transformer.provider === 'postgresql' || Transformer.provider === 'cockroachdb'
                  ? 'skipDuplicates: z.boolean().optional()'
                  : ''
              } })`,
            )}`,
          );
        }
      }

      // Generate createManyAndReturn schema (same as createMany but returns created records)
      if (Transformer.isOperationEnabled(modelName, 'createManyAndReturn')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          logger.debug(`⏭️  Minimal mode: skipping ${modelName}.createManyAndReturn`);
        } else {
          const imports = [
            selectImport,
            this.generateImportStatement(
              `${modelName}CreateManyInputObjectSchema`,
              `./objects/${modelName}CreateManyInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `createManyAndReturn${modelName}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}CreateManyAndReturn`,
              `z.object({ ${selectZodSchemaLine} data: z.union([ ${modelName}CreateManyInputObjectSchema, z.array(${modelName}CreateManyInputObjectSchema) ]), ${
                Transformer.provider === 'postgresql' || Transformer.provider === 'cockroachdb'
                  ? 'skipDuplicates: z.boolean().optional()'
                  : ''
              } }).strict()`,
            )}`,
          );
        }
      }

      if (deleteOne && Transformer.isOperationEnabled(modelName, 'deleteOne')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          const ops = (cfg as unknown as { minimalOperations?: string[] }).minimalOperations;
          if (Array.isArray(ops) && !ops.includes('delete') && !ops.includes('deleteOne')) {
            logger.debug(`⏭️  Minimal mode (custom ops): skipping ${modelName}.deleteOne`);
          } else {
            const imports = [
              selectImport,
              includeImport,
              this.generateImportStatement(
                `${modelName}WhereUniqueInputObjectSchema`,
                `./objects/${modelName}WhereUniqueInput.schema`,
              ),
            ];
            await writeFileSafely(
              path.join(Transformer.getSchemasPath(), `${deleteOne}.schema.ts`),
              `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
                `${modelName}DeleteOne`,
                `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema  })`,
              )}`,
            );
          }
        } else {
          const imports = [
            selectImport,
            includeImport,
            this.generateImportStatement(
              `${modelName}WhereUniqueInputObjectSchema`,
              `./objects/${modelName}WhereUniqueInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `${deleteOne}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}DeleteOne`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema  })`,
            )}`,
          );
        }
      }

      if (deleteMany && Transformer.isOperationEnabled(modelName, 'deleteMany')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          logger.debug(`⏭️  Minimal mode: skipping ${modelName}.deleteMany`);
        } else {
          const imports = [
            this.generateImportStatement(
              `${modelName}WhereInputObjectSchema`,
              `./objects/${modelName}WhereInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `${deleteMany}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}DeleteMany`,
              `z.object({ where: ${modelName}WhereInputObjectSchema.optional()  })`,
            )}`,
          );
        }
      }

      if (updateOne && Transformer.isOperationEnabled(modelName, 'updateOne')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          const ops = (cfg as unknown as { minimalOperations?: string[] }).minimalOperations;
          if (Array.isArray(ops) && !ops.includes('update') && !ops.includes('updateOne')) {
            logger.debug(`⏭️  Minimal mode (custom ops): skipping ${modelName}.updateOne`);
            // Do not generate
          } else {
            const imports = [
              selectImport,
              includeImport,
              this.generateImportStatement(
                `${modelName}UpdateInputObjectSchema`,
                `./objects/${modelName}UpdateInput.schema`,
              ),
              this.generateImportStatement(
                `${modelName}UncheckedUpdateInputObjectSchema`,
                `./objects/${modelName}UncheckedUpdateInput.schema`,
              ),
              this.generateImportStatement(
                `${modelName}WhereUniqueInputObjectSchema`,
                `./objects/${modelName}WhereUniqueInput.schema`,
              ),
            ];
            await writeFileSafely(
              path.join(Transformer.getSchemasPath(), `${updateOne}.schema.ts`),
              `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
                `${modelName}UpdateOne`,
                `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema]), where: ${modelName}WhereUniqueInputObjectSchema  })`,
              )}`,
            );
          }
        } else {
          const imports = [
            selectImport,
            includeImport,
            this.generateImportStatement(
              `${modelName}UpdateInputObjectSchema`,
              `./objects/${modelName}UpdateInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}UncheckedUpdateInputObjectSchema`,
              `./objects/${modelName}UncheckedUpdateInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}WhereUniqueInputObjectSchema`,
              `./objects/${modelName}WhereUniqueInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `${updateOne}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}UpdateOne`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} data: z.union([${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema]), where: ${modelName}WhereUniqueInputObjectSchema  })`,
            )}`,
          );
        }
      }

      if (updateMany && Transformer.isOperationEnabled(modelName, 'updateMany')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          logger.debug(`⏭️  Minimal mode: skipping ${modelName}.updateMany`);
        } else {
          const imports = [
            this.generateImportStatement(
              `${modelName}UpdateManyMutationInputObjectSchema`,
              `./objects/${modelName}UpdateManyMutationInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}WhereInputObjectSchema`,
              `./objects/${modelName}WhereInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `${updateMany}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}UpdateMany`,
              `z.object({ data: ${modelName}UpdateManyMutationInputObjectSchema, where: ${modelName}WhereInputObjectSchema.optional()  })`,
            )}`,
          );
        }
      }

      // Generate updateManyAndReturn schema (same as updateMany but returns updated records)
      if (Transformer.isOperationEnabled(modelName, 'updateManyAndReturn')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          logger.debug(`⏭️  Minimal mode: skipping ${modelName}.updateManyAndReturn`);
        } else {
          const imports = [
            selectImport,
            this.generateImportStatement(
              `${modelName}UpdateManyMutationInputObjectSchema`,
              `./objects/${modelName}UpdateManyMutationInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}WhereInputObjectSchema`,
              `./objects/${modelName}WhereInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `updateManyAndReturn${modelName}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}UpdateManyAndReturn`,
              `z.object({ ${selectZodSchemaLine} data: ${modelName}UpdateManyMutationInputObjectSchema, where: ${modelName}WhereInputObjectSchema.optional()  }).strict()`,
            )}`,
          );
        }
      }

      if (upsertOne && Transformer.isOperationEnabled(modelName, 'upsertOne')) {
        const cfg = Transformer.getGeneratorConfig();
        if (cfg?.mode === 'minimal') {
          logger.debug(`⏭️  Minimal mode: skipping ${modelName}.upsertOne`);
        } else {
          const imports = [
            selectImport,
            includeImport,
            this.generateImportStatement(
              `${modelName}WhereUniqueInputObjectSchema`,
              `./objects/${modelName}WhereUniqueInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}CreateInputObjectSchema`,
              `./objects/${modelName}CreateInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}UncheckedCreateInputObjectSchema`,
              `./objects/${modelName}UncheckedCreateInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}UpdateInputObjectSchema`,
              `./objects/${modelName}UpdateInput.schema`,
            ),
            this.generateImportStatement(
              `${modelName}UncheckedUpdateInputObjectSchema`,
              `./objects/${modelName}UncheckedUpdateInput.schema`,
            ),
          ];
          await writeFileSafely(
            path.join(Transformer.getSchemasPath(), `${upsertOne}.schema.ts`),
            `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
              `${modelName}Upsert`,
              `z.object({ ${selectZodSchemaLine} ${includeZodSchemaLine} where: ${modelName}WhereUniqueInputObjectSchema, create: z.union([ ${modelName}CreateInputObjectSchema, ${modelName}UncheckedCreateInputObjectSchema ]), update: z.union([ ${modelName}UpdateInputObjectSchema, ${modelName}UncheckedUpdateInputObjectSchema ])  })`,
            )}`,
          );
        }
      }

      if (aggregate && Transformer.isOperationEnabled(modelName, 'aggregate')) {
        const imports = [
          orderByImport,
          this.generateImportStatement(
            `${modelName}WhereInputObjectSchema`,
            `./objects/${modelName}WhereInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}WhereUniqueInputObjectSchema`,
            `./objects/${modelName}WhereUniqueInput.schema`,
          ),
        ];
        const aggregateOperations = [];
        if (this.aggregateOperationSupport[modelName].count) {
          imports.push(
            this.generateImportStatement(
              `${modelName}CountAggregateInputObjectSchema`,
              `./objects/${modelName}CountAggregateInput.schema`,
            ),
          );
          aggregateOperations.push(
            `_count: z.union([ z.literal(true), ${modelName}CountAggregateInputObjectSchema ]).optional()`,
          );
        }
        if (this.aggregateOperationSupport[modelName].min) {
          imports.push(
            this.generateImportStatement(
              `${modelName}MinAggregateInputObjectSchema`,
              `./objects/${modelName}MinAggregateInput.schema`,
            ),
          );
          aggregateOperations.push(`_min: ${modelName}MinAggregateInputObjectSchema.optional()`);
        }
        if (this.aggregateOperationSupport[modelName].max) {
          imports.push(
            this.generateImportStatement(
              `${modelName}MaxAggregateInputObjectSchema`,
              `./objects/${modelName}MaxAggregateInput.schema`,
            ),
          );
          aggregateOperations.push(`_max: ${modelName}MaxAggregateInputObjectSchema.optional()`);
        }
        if (this.aggregateOperationSupport[modelName].avg) {
          imports.push(
            this.generateImportStatement(
              `${modelName}AvgAggregateInputObjectSchema`,
              `./objects/${modelName}AvgAggregateInput.schema`,
            ),
          );
          aggregateOperations.push(`_avg: ${modelName}AvgAggregateInputObjectSchema.optional()`);
        }
        if (this.aggregateOperationSupport[modelName].sum) {
          imports.push(
            this.generateImportStatement(
              `${modelName}SumAggregateInputObjectSchema`,
              `./objects/${modelName}SumAggregateInput.schema`,
            ),
          );
          aggregateOperations.push(`_sum: ${modelName}SumAggregateInputObjectSchema.optional()`);
        }

        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${aggregate}.schema.ts`),
          `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
            `${modelName}Aggregate`,
            `z.object({ ${orderByZodSchemaLine} where: ${modelName}WhereInputObjectSchema.optional(), cursor: ${modelName}WhereUniqueInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), ${aggregateOperations.join(
              ', ',
            )} })`,
          )}`,
        );
      }

      if (groupBy && Transformer.isOperationEnabled(modelName, 'groupBy')) {
        const imports = [
          this.generateImportStatement(
            `${modelName}WhereInputObjectSchema`,
            `./objects/${modelName}WhereInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}OrderByWithAggregationInputObjectSchema`,
            `./objects/${modelName}OrderByWithAggregationInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}ScalarWhereWithAggregatesInputObjectSchema`,
            `./objects/${modelName}ScalarWhereWithAggregatesInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}ScalarFieldEnumSchema`,
            `./enums/${modelName}ScalarFieldEnum.schema`,
          ),
          this.generateImportStatement(
            `${modelName}CountAggregateInputObjectSchema`,
            `./objects/${modelName}CountAggregateInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}MinAggregateInputObjectSchema`,
            `./objects/${modelName}MinAggregateInput.schema`,
          ),
          this.generateImportStatement(
            `${modelName}MaxAggregateInputObjectSchema`,
            `./objects/${modelName}MaxAggregateInput.schema`,
          ),
        ];
        await writeFileSafely(
          path.join(Transformer.getSchemasPath(), `${groupBy}.schema.ts`),
          `${this.generateImportStatements(imports)}${this.generateExportSchemaStatement(
            `${modelName}GroupBy`,
            `z.object({ where: ${modelName}WhereInputObjectSchema.optional(), orderBy: z.union([${modelName}OrderByWithAggregationInputObjectSchema, ${modelName}OrderByWithAggregationInputObjectSchema.array()]).optional(), having: ${modelName}ScalarWhereWithAggregatesInputObjectSchema.optional(), take: z.number().optional(), skip: z.number().optional(), by: z.array(${modelName}ScalarFieldEnumSchema), _count: z.union([ z.literal(true), ${modelName}CountAggregateInputObjectSchema ]).optional(), _min: ${modelName}MinAggregateInputObjectSchema.optional(), _max: ${modelName}MaxAggregateInputObjectSchema.optional() })`,
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
    if (config?.emit && config.emit.results === false) {
      logger.debug('⏭️  emit.results=false (skipping result schema generation)');
      return;
    }

    // Check if result schemas are enabled globally
    if (config?.mode === 'minimal') {
      logger.debug('⏭️  Skipping result schema generation in minimal mode');
      return;
    }
    if (config?.variants?.result?.enabled === false) {
      logger.debug('⏭️  Result schema generation is disabled globally');
      return;
    }

    const resultGenerator = new ResultSchemaGenerator();

    const opSuffix = (op: string): string => {
      switch (op) {
        case 'findUnique':
          return 'FindUnique';
        case 'findFirst':
          return 'FindFirst';
        case 'findMany':
          return 'FindMany';
        case 'create':
          return 'Create';
        case 'createMany':
          return 'CreateMany';
        case 'update':
          return 'Update';
        case 'updateMany':
          return 'UpdateMany';
        case 'upsert':
          return 'Upsert';
        case 'delete':
          return 'Delete';
        case 'deleteMany':
          return 'DeleteMany';
        case 'aggregate':
          return 'Aggregate';
        case 'groupBy':
          return 'GroupBy';
        case 'count':
          return 'Count';
        default:
          return op;
      }
    };

    for (const model of this.models) {
      // Skip generation for disabled models
      if (!Transformer.isModelEnabled(model.name)) {
        continue;
      }

      // Check if result schemas are enabled for this specific model
      const modelConfig = config?.models?.[model.name];
      if (modelConfig?.variants?.result?.enabled === false) {
        logger.debug(`⏭️  Result schema generation is disabled for model: ${model.name}`);
        continue;
      }

      logger.debug(`🎯 Generating result schemas for model: ${model.name}`);

      // Generate all result schemas for this model
      const resultSchemas = resultGenerator.generateAllResultSchemas(model);

      // Create results directory if it doesn't exist
      const resultsPath = path.join(Transformer.getSchemasPath(), 'results');

      // Write each result schema to appropriate file
      for (const resultSchema of resultSchemas) {
        const fileName = `${model.name}${opSuffix(resultSchema.operationType as unknown as string)}Result.schema.ts`;
        const filePath = path.join(resultsPath, fileName);

        // Generate imports only for schemas that are actually used
        const imports: string[] = [];

        // Add zod import
        imports.push(this.generateImportZodStatement());

        // Only add other imports if they're actually referenced in the schema
        if (resultSchema.dependencies && resultSchema.dependencies.length > 0) {
          resultSchema.dependencies.forEach((dep: string) => {
            imports.push(
              this.generateImportStatement(dep, `../objects/${dep.replace('Schema', '')}.schema`),
            );
          });
        }

        await writeFileSafely(filePath, `${imports.join('')}${resultSchema.zodSchema}`);
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
          `export { ${resultSchema.schemaName} } from './${model.name}${opSuffix(resultSchema.operationType as unknown as string)}Result.schema';`,
        );
      }
    }

    if (allExports.length > 0) {
      await writeFileSafely(resultIndexPath, allExports.join('\n') + '\n');

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
  static parseImportStatement(
    importStatement: string,
  ): { importName: string; importPath: string; relatedModel?: string } | null {
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
      relatedModel: relatedModel || undefined,
    };
  }

  /**
   * Generate smart import statement that checks if target exists
   */
  generateSmartImportStatement(
    importName: string,
    importPath: string,
    relatedModel?: string,
  ): string {
    // Use the static validated version
    return Transformer.generateValidatedImportStatement(importName, importPath, relatedModel);
  }

  /**
   * Log import management information
   */
  static logImportManagement(
    originalImports: (string | undefined)[],
    cleanedImports: string[],
    context?: string,
  ): void {
    const originalCount = originalImports.filter((imp) => imp && imp.trim()).length;
    const cleanedCount = cleanedImports.length;

    if (originalCount !== cleanedCount) {
      const contextStr = context ? ` for ${context}` : '';
      logger.debug(
        `   📦 Import cleanup${contextStr}: ${originalCount - cleanedCount} filtered (${cleanedCount}/${originalCount} kept)`,
      );
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
      suggestions: [],
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
  static validateModelDependencies(
    allModels: PrismaDMMF.Model[],
    result: FilterValidationResult,
  ): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    for (const model of allModels) {
      if (!this.isModelEnabled(model.name)) continue;

      // Check if this model has relationships to disabled models
      const disabledRelations = model.fields.filter((field) => {
        return field.kind === 'object' && field.relationName && !this.isModelEnabled(field.type);
      });

      if (disabledRelations.length > 0) {
        const disabledModels = disabledRelations.map((f) => f.type);
        result.warnings.push(
          `Model "${model.name}" has relations to disabled models: ${disabledModels.join(', ')}. ` +
            `This may cause incomplete schema generation.`,
        );

        result.suggestions.push(
          `Consider enabling models [${disabledModels.join(', ')}] or removing relation fields ` +
            `[${disabledRelations.map((f) => f.name).join(', ')}] from ${model.name}`,
        );
      }
    }
  }

  /**
   * Validate operation consistency across models
   */
  static validateOperationConsistency(
    allModels: PrismaDMMF.Model[],
    result: FilterValidationResult,
  ): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledModels = allModels.filter((m) => this.isModelEnabled(m.name));

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
              `This operation may not function as expected.`,
          );
        }
      }

      // Check for circular dependencies in custom operations
      if (modelConfig.operations.length === 0) {
        result.warnings.push(
          `Model "${model.name}" has no operations enabled. Consider disabling the model entirely.`,
        );
      }
    }
  }

  /**
   * Validate field exclusion conflicts
   */
  static validateFieldExclusions(
    allModels: PrismaDMMF.Model[],
    result: FilterValidationResult,
  ): void {
    const config = this.getGeneratorConfig();
    if (!config) return;

    const enabledModels = allModels.filter((m) => this.isModelEnabled(m.name));

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
            `Model "${model.name}" ${variant} variant excludes all fields. This will result in empty schemas.`,
          );
          result.isValid = false;
        }

        // Check for required fields being excluded
        const requiredFields = model.fields.filter((f) => f.isRequired && f.kind === 'scalar');
        const excludedRequiredFields = requiredFields.filter(
          (f) => variantConfig.excludeFields && variantConfig.excludeFields.includes(f.name),
        );

        if (excludedRequiredFields.length > 0 && variant === 'input') {
          result.warnings.push(
            `Model "${model.name}" ${variant} variant excludes required fields: ` +
              `${excludedRequiredFields.map((f) => f.name).join(', ')}. This may cause validation issues.`,
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
    const enabledVariants = configuredVariants.filter(
      (variant) =>
        config.variants && config.variants[variant as keyof typeof config.variants]?.enabled,
    );

    if (enabledVariants.length === 0) {
      result.warnings.push(
        'Variants are configured but none are enabled. Consider enabling at least one variant or removing variant configuration.',
      );
    }

    // Check for conflicting variant settings
    if (config.mode === 'minimal' && enabledVariants.includes('result')) {
      result.warnings.push(
        'Minimal mode with result variant enabled may generate more schemas than expected. ' +
          'Consider using only pure and input variants in minimal mode.',
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
        'Minimal mode requires explicit model configuration. No models are configured for generation.',
      );
      result.isValid = false;

      result.suggestions.push(
        'Add model configurations to your config file or switch to "full" mode for automatic model inclusion.',
      );
    }

    // Check if custom mode has meaningful configuration
    if (config.mode === 'custom' && (!config.models || Object.keys(config.models).length === 0)) {
      result.warnings.push(
        'Custom mode without model configurations will behave like full mode. Consider adding specific model settings.',
      );
    }
  }

  /**
   * Log filter validation results
   */
  static logFilterValidation(validationResult: FilterValidationResult): void {
    const { isValid, errors, warnings, suggestions } = validationResult;

    if (errors.length > 0) {
      logger.warn('❌ Filter Validation Errors:');
      errors.forEach((error) => logger.warn(`   • ${error}`));
    }

    if (warnings.length > 0) {
      logger.warn('⚠️  Filter Validation Warnings:');
      warnings.forEach((warning) => logger.warn(`   • ${warning}`));
    }

    if (suggestions.length > 0) {
      logger.info('💡 Suggestions:');
      suggestions.forEach((suggestion) => logger.info(`   • ${suggestion}`));
    }

    if (isValid && errors.length === 0 && warnings.length === 0) {
      logger.debug('✅ Filter configuration validation passed');
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
      ? this.generateSmartImportStatement(
          `${modelName}SelectObjectSchema`,
          `./objects/${modelName}Select.schema`,
          modelName,
        )
      : '';

    const includeImport = Transformer.shouldGenerateIncludeSchema(model)
      ? this.generateSmartImportStatement(
          `${modelName}IncludeObjectSchema`,
          `./objects/${modelName}Include.schema`,
          modelName,
        )
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

    const orderByImport = this.generateImportStatement(
      `${modelOrderBy}ObjectSchema`,
      `./objects/${modelOrderBy}.schema`,
    );
    const orderByZodSchemaLine = `orderBy: z.union([${modelOrderBy}ObjectSchema, ${modelOrderBy}ObjectSchema.array()]).optional(),`;

    return { orderByImport, orderByZodSchemaLine };
  }

  /**
   * Determines if a select schema should be inlined to avoid circular dependencies.
   * Following community generator approach: ALWAYS inline select schemas.
   * Use lazy loading only for specific relation fields within the inlined schema.
   */
  shouldInlineSelectSchema(_model: PrismaDMMF.Model): boolean {
    // Community generator approach: Always inline select schemas
    // This prevents circular imports by keeping select definitions local
    // Use z.lazy() only for relation fields within the inlined schema
    return true; // Always inline - aggressive inlining like community generator
  }

  /**
   * Generates inline select schema definition code within the FindMany file.
   * This prevents circular imports by defining the schema locally.
   * Follows community generator pattern with aggressive inlining.
   */
  generateInlineSelectSchema(model: PrismaDMMF.Model): string {
    const { name: modelName, fields } = model;

    // Generate field definitions for the select schema
    const selectFields: string[] = [];

    for (const field of fields) {
      const { name: fieldName, relationName } = field;

      if (relationName) {
        // Simplified relation selection: allow boolean only (drop ArgsObjectSchema dependency)
        selectFields.push(`  ${fieldName}: z.boolean().optional()`);
      } else {
        // Scalar field: just boolean
        selectFields.push(`  ${fieldName}: z.boolean().optional()`);
      }
    }

    // Add _count field if model has array relations (for aggregation support)
    const hasArrayRelations = fields.some((field) => field.relationName && field.isList);
    if (hasArrayRelations) {
      selectFields.push(`  _count: z.boolean().optional()`);
    }

    return `export const ${modelName}SelectSchema: z.ZodType<Prisma.${modelName}Select, Prisma.${modelName}Select> = z.object({
${selectFields.join(',\n')}
}).strict()`;
  }

  /**
   * Generates the additional imports needed for inlined select schemas.
   * Returns import statements for Args schemas referenced in relation fields.
   */
  generateInlineSelectImports(model: PrismaDMMF.Model): string[] {
    const imports: string[] = [];

    for (const field of model.fields) {
      if (field.relationName) {
        const argsSchema = `${field.type}ArgsObjectSchema`;
        imports.push(`import { ${argsSchema} } from './objects/${field.type}Args.schema'`);
      }
    }

    // Add _count import if model has array relations (only these get count output types)
    const hasArrayRelations = model.fields.some((field) => field.relationName && field.isList);
    if (hasArrayRelations) {
      imports.push(
        `import { ${model.name}CountOutputTypeArgsObjectSchema } from './objects/${model.name}CountOutputTypeArgs.schema'`,
      );
    }

    // Remove duplicates
    return [...new Set(imports)];
  }

  /**
   * Generates dual schema exports: typed version and Zod-method-friendly version
   */
  generateDualSchemaExports(
    modelName: string,
    operationType: string,
    schemaDefinition: string,
    prismaType: string,
  ): string {
    const exports: string[] = [];

    // Generate typed schema (perfect inference, no methods)
    if (Transformer.exportTypedSchemas) {
      const typedName = `${modelName}${operationType}${Transformer.typedSchemaSuffix}`;
      exports.push(
        `export const ${typedName}: z.ZodType<${prismaType}, ${prismaType}> = ${schemaDefinition};`,
      );
    }

    // Generate Zod schema (methods available, loose inference)
    if (Transformer.exportZodSchemas) {
      const zodName = `${modelName}${operationType}${Transformer.zodSchemaSuffix}`;
      exports.push(`export const ${zodName} = ${schemaDefinition};`);
    }

    return exports.join('\n\n');
  }

  /**
   * Generates dual select schema exports for inlined schemas
   */
  generateDualSelectSchemaExports(
    model: PrismaDMMF.Model,
    operation?: 'FindFirst' | 'FindFirstOrThrow' | 'FindMany' | 'FindUnique' | 'FindUniqueOrThrow',
  ): string {
    const modelName = model.name;
    const schemaDefinition = this.generateInlineSelectSchemaDefinition(model);
    const exports: string[] = [];

    // Generate typed select schema
    if (Transformer.exportTypedSchemas) {
      const typedName = `${modelName}${operation ? operation : ''}Select${Transformer.typedSchemaSuffix}`;
      exports.push(
        `export const ${typedName}: z.ZodType<Prisma.${modelName}Select, Prisma.${modelName}Select> = ${schemaDefinition};`,
      );
    }

    // Generate Zod select schema
    if (Transformer.exportZodSchemas) {
      const zodName = `${modelName}${operation ? operation : ''}Select${Transformer.zodSchemaSuffix}`;
      exports.push(`export const ${zodName} = ${schemaDefinition};`);
    }

    return exports.join('\n\n');
  }

  /**
   * Generates just the schema definition without export statement
   */
  generateInlineSelectSchemaDefinition(model: PrismaDMMF.Model): string {
    const { fields } = model;

    // Generate field definitions for the select schema
    const selectFields: string[] = [];

    for (const field of fields) {
      const { name: fieldName, relationName } = field;

      if (relationName) {
        // Simplified relation selection: allow boolean only (drop ArgsObjectSchema dependency)
        selectFields.push(`    ${fieldName}: z.boolean().optional()`);
      } else {
        // Scalar field: just boolean
        selectFields.push(`    ${fieldName}: z.boolean().optional()`);
      }
    }

    // Add _count field if model has array relations (for aggregation support)
    const hasArrayRelations = fields.some((field) => field.relationName && field.isList);
    if (hasArrayRelations) {
      selectFields.push(`    _count: z.boolean().optional()`);
    }

    return `z.object({
${selectFields.join(',\n')}
  }).strict()`;
  }
}
