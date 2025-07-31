import {
  DMMF,
  EnvValue,
  GeneratorConfig,
  GeneratorOptions,
} from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
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
import { 
  parseGeneratorOptions, 
  validateGeneratorOptions,
  generatorOptionsToConfigOverrides,
  isLegacyUsage,
  getLegacyMigrationSuggestions
} from './config/generator-options';
import { processConfiguration } from './config/defaults';
import { parseConfiguration, GeneratorConfig as CustomGeneratorConfig } from './config/parser';

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
      
      // Step 1: Load config file if specified (medium priority)
      if (extendedOptions.config) {
        const parseResult = await parseConfiguration(extendedOptions.config);
        configFileOptions = parseResult.config;
        console.log(`📋 Loaded configuration from: ${parseResult.configPath || 'discovered file'}`);
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
      generatorConfig = processConfiguration(mergedConfig, availableModels);
      
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

    await generateEnumSchemas(
      [...prismaClientDmmf.schema.enumTypes.prisma],
      [...(prismaClientDmmf.schema.enumTypes.model ?? [])],
    );

    const dataSource = options.datasources?.[0];
    const previewFeatures = prismaClientGeneratorConfig?.previewFeatures;
    Transformer.provider = dataSource.provider;
    Transformer.previewFeatures = previewFeatures;
    
    // Set the generator configuration for filtering
    Transformer.setGeneratorConfig(generatorConfig);

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
    await generateObjectSchemas(mutableInputObjectTypes);
    await generateModelSchemas(
      models,
      [...modelOperations],
      aggregateOperationSupport,
    );
    await generateIndex();
    
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

async function generateObjectSchemas(inputObjectTypes: DMMF.InputType[]) {
  for (let i = 0; i < inputObjectTypes.length; i += 1) {
    const fields = inputObjectTypes[i]?.fields;
    const name = inputObjectTypes[i]?.name;
    
    // Filter object schemas based on enabled models
    if (name && !isObjectSchemaEnabled(name)) {
      continue;
    }
    
    const transformer = new Transformer({ name, fields: [...(fields || [])] });
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
    /^(\w+)WhereInput$/,
    /^(\w+)WhereUniqueInput$/,
    /^(\w+)CreateInput$/,
    /^(\w+)UpdateInput$/,
    /^(\w+)UncheckedCreateInput$/,
    /^(\w+)UncheckedUpdateInput$/,
    /^(\w+)OrderByWithRelationInput$/,
    /^(\w+)OrderByWithAggregationInput$/,
    /^(\w+)ScalarWhereWithAggregatesInput$/,
    /^(\w+)CountOrderByAggregateInput$/,
    /^(\w+)AvgOrderByAggregateInput$/,
    /^(\w+)MaxOrderByAggregateInput$/,
    /^(\w+)MinOrderByAggregateInput$/,
    /^(\w+)SumOrderByAggregateInput$/,
    /^(\w+)IncludeObjectSchema$/,
    /^(\w+)SelectObjectSchema$/,
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
