import {
    DMMF,
    EnvValue,
    GeneratorConfig,
    GeneratorOptions,
} from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import path from 'path';
import { processConfiguration } from './config/defaults';
import {
    generatorOptionsToConfigOverrides,
    getLegacyMigrationSuggestions,
    isLegacyUsage,
    parseGeneratorOptions,
    validateGeneratorOptions
} from './config/generator-options';
import { GeneratorConfig as CustomGeneratorConfig, parseConfiguration } from './config/parser';
import {
    addMissingInputObjectTypes,
    hideInputObjectTypesAndRelatedFields,
    resolveAddMissingInputObjectTypeOptions,
    resolveModelsComments,
} from './helpers';
import { resolveAggregateOperationSupport } from './helpers/aggregate-helpers';
import Transformer from './transformer';
import { AggregateOperationSupport } from './types';
import removeDir from './utils/removeDir';
import { writeFileSafely } from './utils/writeFileSafely';

export async function generate(options: GeneratorOptions) {
  try {
    // Parse and validate new generator options
    const extendedOptions = parseGeneratorOptions(options.generator.config as Record<string, string>);
    validateGeneratorOptions(extendedOptions);

    // Handle backward compatibility and provide migration suggestions
    if (isLegacyUsage(extendedOptions)) {
      const suggestions = getLegacyMigrationSuggestions(extendedOptions);
      if (suggestions.length > 0) {
        console.log('ℹ️ Prisma Zod Generator: Legacy usage detected.');
        console.log('Consider migrating to the new configuration system for better control:');
        suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
        console.log(''); // Add blank line for readability
      }
    }

    await handleGeneratorOutputValue(options.generator.output as EnvValue);

    const prismaClientGeneratorConfig = 
      getGeneratorConfigByProvider(options.otherGenerators, 'prisma-client-js') ||
      getGeneratorConfigByProvider(options.otherGenerators, 'prisma-client');

    if (!prismaClientGeneratorConfig) {
      throw new Error(
        'Prisma Zod Generator requires either "prisma-client-js" or "prisma-client" generator to be present in your schema.prisma file.\n\n' +
        'Please add one of the following to your schema.prisma:\n\n' +
        '// For the legacy generator:\n' +
        'generator client {\n' +
        '  provider = "prisma-client-js"\n' +
        '}\n\n' +
        '// Or for the new generator (Prisma 6.12.0+):\n' +
        'generator client {\n' +
        '  provider = "prisma-client"\n' +
        '}'
      );
    }

    const prismaClientDmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientGeneratorConfig?.previewFeatures,
    });

    // Load and process configuration with proper precedence hierarchy:
    // 1. Generator options (highest priority - from Prisma schema)
    // 2. Config file options (medium priority)
    // 3. Default options (lowest priority - applied by processConfiguration)
    let generatorConfig: CustomGeneratorConfig;
    try {
      let configFileOptions: Partial<CustomGeneratorConfig> = {};
      
      // Step 1: Load config file if specified or try auto-discovery (medium priority)
      if (extendedOptions.config) {
        const parseResult = await parseConfiguration(extendedOptions.config);
        configFileOptions = parseResult.config;
        console.log(`📋 Loaded configuration from: ${parseResult.configPath || 'discovered file'}`);
      } else {
        // Try auto-discovery and specific paths
        try {
          const parseResult = await parseConfiguration();
          if (!parseResult.isDefault) {
            configFileOptions = parseResult.config;
            console.log(`📋 Auto-discovered configuration from: ${parseResult.configPath || 'discovered file'}`);
          } else {
            // Try specific paths for config.json
            const specificPaths = ['./prisma/config.json', './config.json', './zod-generator.config.json'];
            for (const path of specificPaths) {
              try {
                const parseResult = await parseConfiguration(path);
                configFileOptions = parseResult.config;
                console.log(`📋 Found configuration at: ${path}`);
                break;
              } catch (e) {
                // Continue to next path
              }
            }
          }
        } catch (discoveryError) {
          console.log(`📋 No configuration file found, using defaults`);
        }
      }
      
      // Step 2: Apply generator option overrides (highest priority)
      const generatorOptionOverrides = generatorOptionsToConfigOverrides(extendedOptions);
      
      // Step 3: Merge with proper precedence (generator options override config file options)
      const mergedConfig = mergeConfigurationWithPrecedence(
        configFileOptions,
        generatorOptionOverrides
      );
      
      
      // Step 4: Process final configuration with defaults (lowest priority)
      const availableModels = prismaClientDmmf.datamodel.models.map(m => m.name);
      const modelFieldInfo: { [modelName: string]: string[] } = {};
      prismaClientDmmf.datamodel.models.forEach(model => {
        modelFieldInfo[model.name] = model.fields.map(field => field.name);
      });
      generatorConfig = processConfiguration(mergedConfig, availableModels, modelFieldInfo);
      
      // Log configuration precedence information
      logConfigurationPrecedence(extendedOptions, configFileOptions, generatorOptionOverrides);
      
    } catch (configError) {
      console.warn(`⚠️  Configuration loading failed, using defaults: ${configError}`);
      // Fall back to defaults
      generatorConfig = processConfiguration({});
    }


    checkForCustomPrismaClientOutputPath(prismaClientGeneratorConfig);
    setPrismaClientProvider(prismaClientGeneratorConfig);
    setPrismaClientConfig(prismaClientGeneratorConfig);

    const modelOperations = prismaClientDmmf.mappings.modelOperations;
    const inputObjectTypes = prismaClientDmmf.schema.inputObjectTypes.prisma;
    // Filter out AndReturn types that were introduced in Prisma 6 but shouldn't have Zod schemas
    const outputObjectTypes =
      prismaClientDmmf.schema.outputObjectTypes.prisma.filter(
        (type) => !type.name.includes('AndReturn'),
      );
    const enumTypes = prismaClientDmmf.schema.enumTypes;
    const models: DMMF.Model[] = [...prismaClientDmmf.datamodel.models];
    const hiddenModels: string[] = [];
    const hiddenFields: string[] = [];
    resolveModelsComments(
      models,
      [...modelOperations],
      {
        model: enumTypes.model ? [...enumTypes.model] : undefined,
        prisma: [...enumTypes.prisma],
      },
      hiddenModels,
      hiddenFields,
    );

    const dataSource = options.datasources?.[0];
    const previewFeatures = prismaClientGeneratorConfig?.previewFeatures;
    Transformer.provider = dataSource.provider;
    Transformer.previewFeatures = previewFeatures;
    
    // Set the generator configuration for filtering BEFORE generating schemas
    Transformer.setGeneratorConfig(generatorConfig);

    await generateEnumSchemas(
      [...prismaClientDmmf.schema.enumTypes.prisma],
      [...(prismaClientDmmf.schema.enumTypes.model ?? [])],
    );

    // Validate filtering configuration and provide feedback
    const validationResult = Transformer.validateFilterCombinations(models);
    if (!validationResult.isValid) {
      console.error('❌ Configuration validation failed:');
      validationResult.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error('Invalid filtering configuration. Please fix the errors above.');
    }
    
    if (validationResult.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:');
      validationResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    if (validationResult.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      validationResult.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }

    // Merge backward compatibility options with new configuration
    const backwardCompatibleOptions = {
      isGenerateSelect: extendedOptions.isGenerateSelect?.toString() || 'false',
      isGenerateInclude: extendedOptions.isGenerateInclude?.toString() || 'false',
    };

    const addMissingInputObjectTypeOptions =
      resolveAddMissingInputObjectTypeOptions(backwardCompatibleOptions);

    const mutableInputObjectTypes = [...inputObjectTypes];
    const mutableOutputObjectTypes = [...outputObjectTypes];

    addMissingInputObjectTypes(
      mutableInputObjectTypes,
      mutableOutputObjectTypes,
      models,
      [...modelOperations],
      dataSource.provider,
      addMissingInputObjectTypeOptions,
    );

    const aggregateOperationSupport = resolveAggregateOperationSupport(
      mutableInputObjectTypes,
    );

    hideInputObjectTypesAndRelatedFields(
      mutableInputObjectTypes,
      hiddenModels,
      hiddenFields,
    );
    await generateObjectSchemas(mutableInputObjectTypes, models);
    await generateModelSchemas(
      models,
      [...modelOperations],
      aggregateOperationSupport,
    );
    await generateIndex();
    
    // Generate pure model schemas if enabled
    await generatePureModelSchemas(models, generatorConfig);
    
    // Generate variant schemas if enabled
    await generateVariantSchemas(models, generatorConfig);
    
    // Update main index to include variants
    await updateIndexWithVariants(generatorConfig);
    
    // Generate filtering summary
    generateFilteringSummary(models, generatorConfig);
  } catch (error) {
    console.error(error);
  }
}

async function handleGeneratorOutputValue(generatorOutputValue: EnvValue) {
  const outputDirectoryPath = parseEnvValue(generatorOutputValue);

  // create the output directory and delete contents that might exist from a previous run
  await fs.mkdir(outputDirectoryPath, { recursive: true });
  const isRemoveContentsOnly = true;
  await removeDir(outputDirectoryPath, isRemoveContentsOnly);

  Transformer.setOutputPath(outputDirectoryPath);
}

function getGeneratorConfigByProvider(
  generators: GeneratorConfig[],
  provider: string,
) {
  return generators.find((it) => parseEnvValue(it.provider) === provider);
}

function checkForCustomPrismaClientOutputPath(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
) {
  if (prismaClientGeneratorConfig?.isCustomOutput) {
    Transformer.setPrismaClientOutputPath(
      prismaClientGeneratorConfig.output?.value as string,
    );
  }
}

function setPrismaClientProvider(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
) {
  if (prismaClientGeneratorConfig?.provider) {
    Transformer.setPrismaClientProvider(
      parseEnvValue(prismaClientGeneratorConfig.provider),
    );
  }
}

function setPrismaClientConfig(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
) {
  if (prismaClientGeneratorConfig?.config) {
    Transformer.setPrismaClientConfig(prismaClientGeneratorConfig.config);
  }
}

async function generateEnumSchemas(
  prismaSchemaEnum: DMMF.SchemaEnum[],
  modelSchemaEnum: DMMF.SchemaEnum[],
) {
  const enumTypes = [...prismaSchemaEnum, ...modelSchemaEnum];
  const enumNames = enumTypes.map((enumItem) => enumItem.name);
  Transformer.enumNames = enumNames ?? [];
  const transformer = new Transformer({
    enumTypes,
  });
  await transformer.generateEnumSchemas();
}

async function generateObjectSchemas(inputObjectTypes: DMMF.InputType[], models: DMMF.Model[]) {
  for (let i = 0; i < inputObjectTypes.length; i += 1) {
    const originalFields = inputObjectTypes[i]?.fields;
    const name = inputObjectTypes[i]?.name;
    
    // Filter object schemas based on enabled models
    if (name && !isObjectSchemaEnabled(name)) {
      continue;
    }
    
    // Apply field filtering before creating transformer
    let filteredFields = [...(originalFields || [])];
    if (name && originalFields) {
      // Extract model name from schema name (e.g., "UserCreateInput" -> "User")
      const modelName = Transformer.extractModelNameFromContext(name);
      const variant = Transformer.determineSchemaVariant(name);
      
      if (modelName) {
        // Apply field filtering using the transformer's filtering logic
        // Cast to the expected type to handle ReadonlyDeep wrapper
        filteredFields = Transformer.filterFields(originalFields as any, modelName, variant, models);
      }
    }
    
    const transformer = new Transformer({ name, fields: filteredFields, models });
    await transformer.generateObjectSchema();
  }
}

/**
 * Check if an object schema should be generated based on enabled models
 */
function isObjectSchemaEnabled(objectSchemaName: string): boolean {
  // Extract potential model name from object schema name
  const modelName = extractModelNameFromObjectSchema(objectSchemaName);
  
  if (modelName) {
    return Transformer.isModelEnabled(modelName);
  }
  
  // If we can't determine the model, generate the schema (default behavior)
  return true;
}

/**
 * Extract model name from object schema name
 * Examples: UserWhereInput -> User, PostCreateInput -> Post
 */
function extractModelNameFromObjectSchema(objectSchemaName: string): string | null {
  // Common patterns for Prisma object schema names
  const patterns = [
    // Most specific patterns first to avoid false matches
    /^(\w+)UncheckedCreateNestedManyWithout\w+Input$/,
    /^(\w+)UncheckedUpdateManyWithout\w+Input$/,
    /^(\w+)UncheckedUpdateManyWithout\w+NestedInput$/,
    /^(\w+)UncheckedCreateWithout\w+Input$/,
    /^(\w+)UncheckedUpdateWithout\w+Input$/,
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
    /^(\w+)UpdateManyWithWhereWithout\w+Input$/,
    /^(\w+)UpdateWithWhereUniqueWithout\w+Input$/,
    /^(\w+)UpsertWithWhereUniqueWithout\w+Input$/,
    /^(\w+)UpdateManyWithout\w+NestedInput$/,
    /^(\w+)CreateManyAuthorInput$/,
    /^(\w+)CreateManyAuthorInputEnvelope$/,
    /^(\w+)ScalarWhereInput$/,
    
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
    
    // Select/Include schemas
    /^(\w+)IncludeObjectSchema$/,
    /^(\w+)SelectObjectSchema$/,
    
    // Args and other schemas
    /^(\w+)Args$/,
  ];
  
  for (const pattern of patterns) {
    const match = objectSchemaName.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

async function generateModelSchemas(
  models: DMMF.Model[],
  modelOperations: DMMF.ModelMapping[],
  aggregateOperationSupport: AggregateOperationSupport,
) {
  // Filter models and operations based on configuration before transformation
  const enabledModels = models.filter(model => Transformer.isModelEnabled(model.name));
  const enabledModelOperations = modelOperations.filter(operation => 
    Transformer.isModelEnabled(operation.model)
  );
  
  // Filter aggregate operation support to only include enabled models
  const filteredAggregateSupport: AggregateOperationSupport = {};
  Object.entries(aggregateOperationSupport).forEach(([modelName, support]) => {
    if (Transformer.isModelEnabled(modelName)) {
      filteredAggregateSupport[modelName] = support;
    }
  });
  
  const transformer = new Transformer({
    models: enabledModels,
    modelOperations: enabledModelOperations,
    aggregateOperationSupport: filteredAggregateSupport,
  });
  await transformer.generateModelSchemas();
  await transformer.generateResultSchemas();
}

async function generateIndex() {
  await Transformer.generateIndex();
}

async function updateIndexWithVariants(config: CustomGeneratorConfig) {
  // Check if variants are enabled and add variants export to main index
  const variants = config.variants;
  if (!variants) return;
  
  const enabledVariants = Object.entries(variants)
    .filter(([_, variantConfig]) => variantConfig?.enabled)
    .map(([variantName]) => variantName);
  
  if (enabledVariants.length === 0) return;
  
  // Import the addIndexExport function and add the variants directory
  const { addIndexExport, writeIndexFile } = await import('./utils/writeIndexFile');
  const outputPath = Transformer.getOutputPath();
  const variantsIndexPath = `${outputPath}/variants/index.ts`;
  
  // Add the variants export to the main index
  addIndexExport(variantsIndexPath);
  
  // Regenerate the main index file to include variants
  const indexPath = path.join(outputPath, 'schemas', 'index.ts');
  await writeIndexFile(indexPath);
  
  console.log('📦 Updated main index to include variants export');
}

/**
 * Generate summary of filtering configuration and results
 */
function generateFilteringSummary(models: DMMF.Model[], config: CustomGeneratorConfig) {
  const totalModels = models.length;
  const enabledModels = models.filter(model => Transformer.isModelEnabled(model.name));
  const enabledModelCount = enabledModels.length;
  const disabledModelCount = totalModels - enabledModelCount;
  
  console.log('\n📊 Generation Summary:');
  console.log(`   Models: ${enabledModelCount}/${totalModels} enabled`);
  
  if (disabledModelCount > 0) {
    const disabledModels = models
      .filter(model => !Transformer.isModelEnabled(model.name))
      .map(model => model.name);
    console.log(`   Disabled models: ${disabledModels.join(', ')}`);
  }
  
  // Show configuration mode
  if (config.mode) {
    console.log(`   Mode: ${config.mode}`);
  }
  
  // Show global exclusions if any
  const globalExclusions = config.globalExclusions;
  if (globalExclusions && Object.values(globalExclusions).some(arr => arr && arr.length > 0)) {
    console.log('   Global exclusions:');
    Object.entries(globalExclusions).forEach(([variant, fields]) => {
      if (fields && fields.length > 0) {
        console.log(`     ${variant}: ${fields.join(', ')}`);
      }
    });
  }
  
  // Show model-specific configurations if any
  const modelConfigs = config.models;
  if (modelConfigs && Object.keys(modelConfigs).length > 0) {
    const configuredModels = Object.keys(modelConfigs).filter(modelName => 
      Transformer.isModelEnabled(modelName)
    );
    if (configuredModels.length > 0) {
      console.log(`   Custom configurations: ${configuredModels.length} models`);
    }
  }
  
  console.log('✅ Zod schemas generated successfully with filtering applied\n');
}

/**
 * Merge configuration with proper precedence handling
 * Generator options override config file options
 */
function mergeConfigurationWithPrecedence(
  configFileOptions: Partial<CustomGeneratorConfig>,
  generatorOverrides: Partial<CustomGeneratorConfig>
): Partial<CustomGeneratorConfig> {
  const result = { ...configFileOptions };
  
  // Apply generator overrides with proper deep merging for nested objects
  Object.keys(generatorOverrides).forEach(key => {
    const override = generatorOverrides[key as keyof CustomGeneratorConfig];
    const existing = result[key as keyof CustomGeneratorConfig];
    
    if (override !== undefined) {
      if (key === 'variants' && 
          existing && typeof existing === 'object' && 
          override && typeof override === 'object') {
        // Special handling for variants - merge nested objects with proper typing
        result.variants = {
          ...(existing as CustomGeneratorConfig['variants']),
          ...(override as CustomGeneratorConfig['variants'])
        };
      } else {
        // Direct override for other properties
        (result as Record<string, unknown>)[key] = override;
      }
    }
  });
  
  return result;
}

/**
 * Log configuration precedence information for debugging
 */
function logConfigurationPrecedence(
  _extendedOptions: unknown,
  configFileOptions: Partial<CustomGeneratorConfig>,
  generatorOverrides: Partial<CustomGeneratorConfig>
): void {
  const hasConfigFile = Object.keys(configFileOptions).length > 0;
  const hasGeneratorOverrides = Object.keys(generatorOverrides).length > 0;
  
  if (hasConfigFile || hasGeneratorOverrides) {
    console.log('🔧 Configuration precedence applied:');
    
    if (hasConfigFile) {
      console.log('   📁 Config file options loaded');
    }
    
    if (hasGeneratorOverrides) {
      console.log('   ⚡ Generator options override:', 
        Object.keys(generatorOverrides).join(', '));
    }
    
    if (hasConfigFile && hasGeneratorOverrides) {
      console.log('   💡 Generator options take precedence over config file settings');
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Generate variant schemas if variants are enabled in configuration
 */
async function generateVariantSchemas(models: DMMF.Model[], config: CustomGeneratorConfig) {
  // Check if variants are enabled and configured
  const variants = config.variants;
  if (!variants) return;
  
  const enabledVariants = Object.entries(variants)
    .filter(([_, variantConfig]) => variantConfig?.enabled)
    .map(([variantName]) => variantName);
  
  if (enabledVariants.length === 0) {
    console.log('📦 No variants enabled, skipping variant generation');
    return;
  }
  
  console.log(`📦 Generating variant schemas for: ${enabledVariants.join(', ')}`);
  
  try {
    const outputPath = Transformer.getOutputPath();
    const variantsOutputPath = `${outputPath}/variants`;
    
    // Filter models based on configuration
    const enabledModels = models.filter(model => Transformer.isModelEnabled(model.name));
    
    if (enabledModels.length === 0) {
      console.log('⚠️  No models enabled for variant generation');
      return;
    }
    
    // Create variants directory
    await fs.mkdir(variantsOutputPath, { recursive: true });
    
    // Generate each variant type
    for (const variantName of enabledVariants) {
      await generateVariantType(enabledModels, variantName, variantsOutputPath, config);
    }
    
    // Generate variants index file
    await generateVariantsIndex(enabledVariants, variantsOutputPath);
    
    console.log(`📦 Generated ${enabledVariants.length} variant types for ${enabledModels.length} models`);
    
  } catch (error) {
    console.error(`❌ Variant generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Don't throw - variant generation failure shouldn't stop the main generation
  }
}

/**
 * Generate schemas for a specific variant type
 */
async function generateVariantType(
  models: DMMF.Model[], 
  variantName: string, 
  outputPath: string, 
  config: CustomGeneratorConfig
) {
  const variantPath = `${outputPath}/${variantName}`;
  await fs.mkdir(variantPath, { recursive: true });
  
  const variantConfig = config.variants?.[variantName as keyof typeof config.variants];
  if (!variantConfig) return;
  
  const exports: string[] = [];
  
  for (const model of models) {
    const modelConfig = config.models?.[model.name];
    const modelVariantConfig = modelConfig?.variants?.[variantName as keyof typeof modelConfig.variants];
    
    // Generate schema for this model/variant combination
    const suffix = variantConfig.suffix?.replace(/^\./, '') || variantName.charAt(0).toUpperCase() + variantName.slice(1);
    const schemaName = `${model.name}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}Schema`;
    const fileName = `${model.name}.${variantName}.ts`;
    const filePath = `${variantPath}/${fileName}`;
    
    // Get effective field exclusions
    const excludeFields = [
      ...(config.globalExclusions?.[variantName as keyof typeof config.globalExclusions] || []),
      ...(variantConfig.excludeFields || []),
      ...(modelVariantConfig?.excludeFields || [])
    ];
    
    // Generate schema content
    const schemaContent = generateVariantSchemaContent(model, schemaName, excludeFields, variantName);
    
    console.log(`   📝 Creating ${variantName} variant: ${fileName} (${schemaName})`);
    
    // Write file
    await writeFileSafely(filePath, schemaContent);
    
    exports.push(`export { ${schemaName} } from './${model.name}.${variantName}';`);
  }
  
  // Generate variant index file
  const variantIndexContent = [
    '/**',
    ` * ${variantName.charAt(0).toUpperCase() + variantName.slice(1)} Variant Schemas`,
    ' * Auto-generated - do not edit manually',
    ' */',
    '',
    ...exports,
    ''
  ].join('\n');
  
  await writeFileSafely(`${variantPath}/index.ts`, variantIndexContent);
}

/**
 * Generate schema content for a specific variant
 */
function generateVariantSchemaContent(
  model: DMMF.Model, 
  schemaName: string, 
  excludeFields: string[], 
  variantName: string
): string {
  const enabledFields = model.fields.filter(field => !excludeFields.includes(field.name));
  
  const fieldDefinitions = enabledFields.map(field => {
    const zodType = getZodTypeForField(field);
    const optional = (!field.isRequired && variantName === 'input') ? '.optional()' : '';
    const nullable = (!field.isRequired && field.type === 'String') ? '.nullable()' : '';
    
    return `    ${field.name}: z.${zodType}${optional}${nullable}`;
  }).join(',\n');
  
  return `import { z } from 'zod';

export const ${schemaName} = z.object({
${fieldDefinitions}
}).strict();

export type ${schemaName.replace('Schema', 'Type')} = z.infer<typeof ${schemaName}>;
`;
}

/**
 * Get Zod type for a Prisma field
 */
function getZodTypeForField(field: DMMF.Field): string {
  switch (field.type) {
    case 'String': return 'string()';
    case 'Int': return 'number().int()';
    case 'Float': return 'number()';
    case 'Boolean': return 'boolean()';
    case 'DateTime': return 'date()';
    case 'Json': return 'unknown()';
    case 'Bytes': return 'instanceof(Buffer)';
    case 'BigInt': return 'bigint()';
    case 'Decimal': return 'number()'; // Simplified
    default:
      // Handle enums and other custom types
      if (field.kind === 'enum') {
        return `enum(${field.type})`;
      }
      return 'unknown()';
  }
}

/**
 * Generate main variants index file
 */
async function generateVariantsIndex(variantNames: string[], outputPath: string) {
  const exports = variantNames.map(variant => 
    `export * from './${variant}';`
  );
  
  const indexContent = [
    '/**',
    ' * Schema Variants Index',
    ' * Auto-generated - do not edit manually',
    ' */',
    '',
    ...exports,
    ''
  ].join('\n');
  
  await writeFileSafely(`${outputPath}/index.ts`, indexContent);
}

/**
 * Generate pure model schemas in models/ directory
 * These are standalone schemas without variant suffixes
 */
async function generatePureModelSchemas(models: DMMF.Model[], config: any): Promise<void> {
  // Check if pure models are enabled and configured
  if (!config.pureModels) {
    return;
  }
  
  console.log('📦 Generating pure model schemas');
  
  try {
    const outputPath = Transformer.getOutputPath();
    const modelsOutputPath = `${outputPath}/models`;
    
    // Filter models based on configuration
    const enabledModels = models.filter(model => Transformer.isModelEnabled(model.name));
    
    if (enabledModels.length === 0) {
      console.log('⚠️  No models enabled for pure model generation');
      return;
    }
    
    // Create models directory
    await fs.mkdir(modelsOutputPath, { recursive: true });
    
    // Import the model generator
    const { PrismaTypeMapper } = await import('./generators/model');
    const typeMapper = new PrismaTypeMapper();
    
    // Generate pure model schemas
    const schemaCollection = typeMapper.generateSchemaCollection(enabledModels);
    
    // Write individual model schema files
    for (const [modelName, schemaData] of schemaCollection.schemas) {
      try {
        const fileName = `${modelName}.model.ts`;
        const filePath = `${modelsOutputPath}/${fileName}`;
        
        if (!schemaData.fileContent?.content) {
          console.error(`   ❌ No content available for ${modelName}`);
          continue;
        }
        
        // Transform content for pure models
        let content = schemaData.fileContent.content;
        
        // Fix import paths to use .model extension instead of lowercase names
        content = content.replace(
          /import\s+{\s*(\w+)Schema\s*}\s+from\s+['"]\.\/(\w+)['"];/g,
          (match, schemaName, importPath) => {
            // Convert lowercase import path to PascalCase.model
            const modelName = importPath.charAt(0).toUpperCase() + importPath.slice(1);
            const modelImportName = schemaName.replace('Schema', 'Model');
            return `import { ${modelImportName} } from './${modelName}.model';`;
          }
        );
        
        // Also fix any references to the imported schemas in lazy() calls
        content = content.replace(
          /z\.lazy\(\(\)\s*=>\s*(\w+)Schema\)/g,
          'z.lazy(() => $1Model)'
        );
        
        // Change export name from Schema to Model
        content = content.replace(
          new RegExp(`export const ${modelName}Schema`, 'g'),
          `export const ${modelName}Model`
        );
        
        // Update variable references within the file
        content = content.replace(
          new RegExp(`typeof ${modelName}Schema`, 'g'),
          `typeof ${modelName}Model`
        );
        
        // Update JSDoc comments
        content = content.replace(
          /Generated Zod schema for (\w+) model/g,
          'Generated Zod model for $1'
        );
        
        // Update type export
        content = content.replace(
          new RegExp(`z\\.infer<typeof ${modelName}Schema>`, 'g'),
          `z.infer<typeof ${modelName}Model>`
        );
        
        console.log(`   📝 Creating pure model: ${fileName} (${modelName}Model)`);
        
        // Use direct file writing to avoid formatting issues
        await fs.writeFile(filePath, content);
        
      } catch (modelError) {
        console.error(`   ❌ Error processing model ${modelName}: ${modelError instanceof Error ? modelError.message : 'Unknown error'}`);
        // Continue with other models
      }
    }
    
    // Generate models index file
    const modelsIndexContent = [
      '/**',
      ' * Pure Model Schemas',
      ' * Auto-generated - do not edit manually',
      ' */',
      '',
      ...Array.from(schemaCollection.schemas.keys()).map(modelName => 
        `export { ${modelName}Model } from './${modelName}.model';`
      ),
      ''
    ].join('\n');
    
    const indexPath = `${modelsOutputPath}/index.ts`;
    await fs.writeFile(indexPath, modelsIndexContent);
    
    console.log(`📦 Generated pure model schemas for ${enabledModels.length} models`);
    
  } catch (error) {
    console.error(`❌ Pure model generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Don't throw - pure model generation failure shouldn't stop the main generation
  }
}
