import { DMMF, EnvValue, GeneratorConfig, GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import fsFull, { promises as fs } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { processConfiguration } from './config/defaults';
import {
  generatorOptionsToConfigOverrides,
  getLegacyMigrationSuggestions,
  isLegacyUsage,
  parseGeneratorOptions,
  validateGeneratorOptions,
} from './config/generator-options';
import {
  GeneratorConfig as CustomGeneratorConfig,
  parseConfiguration,
  VariantConfig,
} from './config/parser';
import {
  addMissingInputObjectTypes,
  hideInputObjectTypesAndRelatedFields,
  resolveAddMissingInputObjectTypeOptions,
  resolveModelsComments,
} from './helpers';
import Transformer from './transformer';
import type { SchemaEnumWithValues } from './types';
import { ResolvedSafetyConfig } from './types/safety';
import { logger } from './utils/logger';
import { addFileToManifest, safeCleanupOutput, saveManifest } from './utils/safeOutputManagement';
import {
  mergeSafetyConfigs,
  parseSafetyConfigFromEnvironment,
  parseSafetyConfigFromGeneratorOptions,
  resolveSafetyConfig,
} from './utils/safetyConfigResolver';
import { createStrictModeResolver, StrictModeResolver } from './utils/strict-mode-resolver';

import {
  flushSingleFile,
  initSingleFile,
  isSingleFileEnabled,
  setSingleFilePrismaImportPath,
} from './utils/singleFileAggregator';
import { writeFileSafely } from './utils/writeFileSafely';

export async function generate(options: GeneratorOptions) {
  try {
    // Parse and validate new generator options
    const extendedOptions = parseGeneratorOptions(
      options.generator.config as Record<string, string>,
    );
    validateGeneratorOptions(extendedOptions);

    // Handle backward compatibility and provide migration suggestions
    if (isLegacyUsage(extendedOptions)) {
      const suggestions = getLegacyMigrationSuggestions(extendedOptions);
      if (suggestions.length > 0) {
        logger.debug('ℹ️ Prisma Zod Generator: Legacy usage detected.');
        logger.debug('Consider migrating to the new configuration system for better control:');
        suggestions.forEach((suggestion) => logger.debug(`  ${suggestion}`));
        logger.debug(''); // Add blank line for readability
      }
    }

    // NOTE: Output path is now initialized AFTER config precedence is resolved
    // to allow JSON config 'output' to be respected when the generator block omits it.

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
          '}',
      );
    }

    maybeWarnOnUnsupportedPrismaVersion(options);

    const prismaClientDmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientGeneratorConfig?.previewFeatures,
    });

    // Load and process configuration with proper precedence hierarchy:
    // 1. Generator options (highest priority - from Prisma schema)
    // 2. Config file options (medium priority)
    // 3. Default options (lowest priority - applied by processConfiguration)
    // (Output path deferred until after this merge so JSON 'output' can be honored if the
    // generator block omits an output attribute.)
    let generatorConfig: CustomGeneratorConfig;
    let resolvedSafetyConfig: ResolvedSafetyConfig | undefined;
    let singleFileMode = false;
    let singleFileName: string | undefined;
    try {
      const schemaBaseDir = path.dirname(options.schemaPath);
      let configFileOptions: Partial<CustomGeneratorConfig> = {};

      // Step 1: Load config file if specified or try auto-discovery (medium priority)
      if (extendedOptions.config) {
        logger.debug(`🔧 Config path specified: ${extendedOptions.config}`);
        logger.debug(`📁 Schema base directory: ${schemaBaseDir}`);
        try {
          const parseResult = await parseConfiguration(extendedOptions.config, schemaBaseDir);
          configFileOptions = parseResult.config;
          logger.debug(
            `📋 Successfully loaded configuration from: ${parseResult.configPath || 'discovered file'}`,
          );
        } catch (configError) {
          if (configError instanceof Error) {
            const resolvedPath = path.isAbsolute(extendedOptions.config)
              ? extendedOptions.config
              : path.resolve(schemaBaseDir, extendedOptions.config);
            console.warn(
              `⚠️  Configuration loading failed:\n` +
                `   Specified path: ${extendedOptions.config}\n` +
                `   Resolved path: ${resolvedPath}\n` +
                `   Error: ${configError.message}\n` +
                `   Falling back to defaults.`,
            );
            logger.debug(`🔍 Config error details:`, configError);
          }
          throw configError; // Re-throw to be handled by outer catch block
        }
      } else {
        // Try auto-discovery and specific paths
        try {
          const parseResult = await parseConfiguration(undefined, schemaBaseDir);
          if (!parseResult.isDefault) {
            configFileOptions = parseResult.config;
            logger.debug(
              `📋 Auto-discovered configuration from: ${parseResult.configPath || 'discovered file'}`,
            );
          } else {
            // Try specific paths for config.json
            const specificPaths = [
              './prisma/config.json',
              './config.json',
              './zod-generator.config.json',
            ];
            for (const path of specificPaths) {
              try {
                const parseResult = await parseConfiguration(path, schemaBaseDir);
                configFileOptions = parseResult.config;
                logger.debug(`📋 Found configuration at: ${path}`);
                break;
              } catch {
                // Continue to next path
              }
            }
          }
        } catch {
          logger.debug(`📋 No configuration file found, using defaults`);
        }
      }

      // Step 2: Apply generator option overrides (highest priority)
      const generatorOptionOverrides = generatorOptionsToConfigOverrides(extendedOptions);

      // Warn about file layout conflicts to prevent surprises
      warnOnFileLayoutConflicts(configFileOptions, generatorOptionOverrides);

      // Step 3: Merge with proper precedence (generator options override config file options)
      const mergedConfig = mergeConfigurationWithPrecedence(
        configFileOptions,
        generatorOptionOverrides,
      );
      // Preserve config file output if still unset after overrides
      if (
        !('output' in mergedConfig) &&
        'output' in configFileOptions &&
        configFileOptions.output
      ) {
        (mergedConfig as Record<string, unknown>).output = configFileOptions.output;
        logger.debug('[debug] applied configFileOptions.output fallback');
      }
      logger.debug(
        `[debug] mergedConfig.naming preset=${(mergedConfig as { naming?: { preset?: string } }).naming?.preset}`,
      );

      // Step 4: Process final configuration with defaults (lowest priority)
      const availableModels = prismaClientDmmf.datamodel.models.map((m) => m.name);
      const modelFieldInfo: { [modelName: string]: string[] } = {};
      prismaClientDmmf.datamodel.models.forEach((model) => {
        modelFieldInfo[model.name] = model.fields.map((field) => field.name);
      });
      generatorConfig = processConfiguration(mergedConfig, availableModels, modelFieldInfo);
      logger.debug(
        `[debug] post-process generatorConfig.naming preset=${generatorConfig.naming?.preset}`,
      );
      logger.debug(`[debug] generatorConfig.output=${generatorConfig.output}`);

      // Log configuration precedence information
      logConfigurationPrecedence(extendedOptions, configFileOptions, generatorOptionOverrides);

      logger.debug(
        `[debug] generatorConfig.output (post-merge/process) = ${generatorConfig.output}`,
      );

      // --- Safety Configuration Resolution ---
      const generatorSafetyConfig = parseSafetyConfigFromGeneratorOptions(
        options.generator.config || {},
      );
      const envSafetyConfig = parseSafetyConfigFromEnvironment();
      const fileSafetyConfig = generatorConfig.safety || {};

      // Merge safety configs with precedence: environment > generator options > config file > defaults
      const mergedSafetyConfig = mergeSafetyConfigs(
        fileSafetyConfig,
        generatorSafetyConfig,
        envSafetyConfig,
      );
      resolvedSafetyConfig = resolveSafetyConfig(mergedSafetyConfig);

      logger.debug(`[debug] resolvedSafetyConfig = ${JSON.stringify(resolvedSafetyConfig)}`);

      // --- Single File Mode Configuration ---
      singleFileMode = generatorConfig.useMultipleFiles === false;
      singleFileName = singleFileMode
        ? (generatorConfig.singleFileName || 'schemas.ts').trim()
        : undefined;

      // --- Output Path Resolution (replaces earlier immediate initialization) ---
      // Precedence for output now:
      // 1. Prisma generator block 'output' attribute (if provided)
      // 2. JSON config 'output' (if provided)
      // 3. Built-in default from processed configuration
      try {
        const schemaBaseDir = path.dirname(options.schemaPath);
        const prismaBlockOutput = options.generator.output as EnvValue | undefined;
        // Heuristic: parse schema.prisma to see if generator zod block explicitly contains an output = line
        let zodBlockHasExplicitOutput = false;
        try {
          const dm = options.datamodel;
          const blockMatch = dm.match(/generator\s+zod\s+{([\s\S]*?)}/m);
          if (blockMatch) {
            const blockBody = blockMatch[1];
            zodBlockHasExplicitOutput = /\boutput\b\s*=/.test(blockBody);
          }
        } catch {}
        const userSpecifiedOutput = zodBlockHasExplicitOutput;
        if (prismaBlockOutput && userSpecifiedOutput) {
          // Resolve generator block output relative to the schema directory
          // to ensure per-test output paths are respected
          const raw = parseEnvValue(prismaBlockOutput);
          const resolved = path.isAbsolute(raw) ? raw : path.join(schemaBaseDir, raw);
          await fs.mkdir(resolved, { recursive: true });
          const manifest = await safeCleanupOutput(
            resolved,
            resolvedSafetyConfig,
            singleFileMode,
            singleFileName,
          );
          Transformer.setOutputPath(resolved);
          Transformer.setCurrentManifest(manifest);
        } else if (generatorConfig.output) {
          // New behavior: allow JSON config to supply output when block omits it
          const resolved = path.isAbsolute(generatorConfig.output)
            ? generatorConfig.output
            : path.join(schemaBaseDir, generatorConfig.output);
          await fs.mkdir(resolved, { recursive: true });
          const manifest = await safeCleanupOutput(
            resolved,
            resolvedSafetyConfig,
            singleFileMode,
            singleFileName,
          );
          Transformer.setOutputPath(resolved);
          Transformer.setCurrentManifest(manifest);
          logger.debug(`[prisma-zod-generator] ℹ️ Using JSON config output path: ${resolved}`);
        } else {
          // Fallback (should rarely happen because processConfiguration sets default)
          const fallback = path.join(path.dirname(options.schemaPath), 'generated');
          await fs.mkdir(fallback, { recursive: true });
          const manifest = await safeCleanupOutput(
            fallback,
            resolvedSafetyConfig,
            singleFileMode,
            singleFileName,
          );
          Transformer.setOutputPath(fallback);
          Transformer.setCurrentManifest(manifest);
          logger.debug(`[prisma-zod-generator] ℹ️ Using fallback output path: ${fallback}`);
        }
      } catch (outputInitError) {
        logger.debug(
          `[prisma-zod-generator] ⚠️ Failed to initialize output path: ${String(outputInitError)}`,
        );
        throw outputInitError;
      }
    } catch (configError) {
      logger.debug(`[prisma-generator] Caught config error: ${configError}`);
      logger.debug(`[prisma-generator] Error type: ${(configError as Error)?.constructor?.name}`);
      logger.debug(`[prisma-generator] Error message: ${(configError as Error)?.message}`);

      // Only catch file not found errors - let validation errors bubble up
      const isFileNotFoundError =
        configError instanceof Error &&
        configError.message.includes('Configuration file not found');
      logger.debug(`[prisma-generator] Is file not found error: ${isFileNotFoundError}`);

      if (isFileNotFoundError) {
        const baseDir = path.dirname(options.schemaPath);
        const configPath = extendedOptions.config || '';
        const resolvedPath = path.isAbsolute(configPath)
          ? configPath
          : path.resolve(baseDir, configPath);
        const msg =
          `[prisma-zod-generator] ⚠️  Configuration loading failed:\n` +
          `   Specified path: ${configPath}\n` +
          `   Resolved path: ${resolvedPath}\n` +
          `   Error: Configuration file not found\n` +
          `   Using defaults instead.`;
        logger.info(msg);
        logger.debug(`[prisma-generator] Warned about file not found, falling back to defaults`);
        // Fall back to defaults for file not found errors
        generatorConfig = processConfiguration({});
      } else {
        logger.debug(`[prisma-generator] Re-throwing error: ${configError}`);
        // Re-throw validation errors and other critical errors
        throw configError;
      }
    }
    checkForCustomPrismaClientOutputPath(
      prismaClientGeneratorConfig,
      path.dirname(options.schemaPath),
    );
    setPrismaClientProvider(prismaClientGeneratorConfig);
    setPrismaClientConfig(prismaClientGeneratorConfig);

    const modelOperations = prismaClientDmmf.mappings.modelOperations;
    const inputObjectTypes = prismaClientDmmf.schema.inputObjectTypes.prisma;
    // Filter out AndReturn types that were introduced in Prisma 6 but shouldn't have Zod schemas
    const outputObjectTypes = prismaClientDmmf.schema.outputObjectTypes.prisma.filter(
      (type) => !type.name.includes('AndReturn'),
    );
    const enumTypes = prismaClientDmmf.schema.enumTypes;
    const models: DMMF.Model[] = [...prismaClientDmmf.datamodel.models];

    const mutableModelOperations = [...modelOperations];
    const mutableEnumTypes: {
      model: SchemaEnumWithValues[] | undefined;
      prisma: SchemaEnumWithValues[];
    } = {
      model: enumTypes.model ? enumTypes.model.map(normalizeSchemaEnum) : undefined,
      prisma: enumTypes.prisma.map(normalizeSchemaEnum),
    };
    const hiddenModels: string[] = [];
    const hiddenFields: string[] = [];
    resolveModelsComments(
      models,
      mutableModelOperations,
      mutableEnumTypes,
      hiddenModels,
      hiddenFields,
    );

    const dataSource = options.datasources?.[0];
    const previewFeatures = prismaClientGeneratorConfig?.previewFeatures;
    Transformer.provider = dataSource.provider;
    Transformer.previewFeatures = previewFeatures;

    // Set the generator configuration for filtering BEFORE generating schemas
    Transformer.setGeneratorConfig(generatorConfig);

    // Init single-file mode if configured
    if (singleFileMode) {
      const bundleName = (generatorConfig.singleFileName || 'schemas.ts').trim();
      const placeAtRoot = generatorConfig.placeSingleFileAtRoot !== false; // default true
      const baseDir = placeAtRoot ? Transformer.getOutputPath() : Transformer.getSchemasPath();
      const bundlePath = path.join(baseDir, bundleName);
      initSingleFile(bundlePath);
      // Configure custom Prisma client import path if user specified custom output (don't rely solely on isCustomOutput flag)
      const potentialClientOut = prismaClientGeneratorConfig?.output?.value as string | undefined;
      if (potentialClientOut && potentialClientOut !== '@prisma/client') {
        try {
          // If potentialClientOut points to node_modules, use the standard @prisma/client import
          if (potentialClientOut.includes('node_modules')) {
            setSingleFilePrismaImportPath('@prisma/client');
          } else {
            let rel = path.relative(baseDir, potentialClientOut).replace(/\\/g, '/');
            if (!rel || rel === '') {
              setSingleFilePrismaImportPath('@prisma/client');
            } else {
              // For the new prisma client generator, the public entry is the 'client' module
              const provider =
                Transformer.getPrismaClientProvider?.() ||
                prismaClientGeneratorConfig?.provider?.value;
              if (provider === 'prisma-client' && !/\/client\/?$/.test(rel)) {
                rel = `${rel.replace(/\/$/, '')}/client`;
              }
              const importPath = rel.startsWith('.') || rel.startsWith('/') ? rel : `./${rel}`;
              const importExtension = Transformer.getImportFileExtension();
              setSingleFilePrismaImportPath(importPath || '@prisma/client', importExtension);
            }
          }
        } catch {
          // Fallback silently to default if relative computation fails
        }
      }
    }

    // Respect explicit emission controls for enums (default true)
    const emitEnums = generatorConfig.emit?.enums !== false;
    if (emitEnums) {
      // Include datamodel enums to capture unused enums that don't appear in schema.enumTypes
      // Transform datamodel enums to match schema enum structure
      const transformedDatamodelEnums = prismaClientDmmf.datamodel.enums
        .filter(
          (datamodelEnum) =>
            !mutableEnumTypes.model?.some((schemaEnum) => schemaEnum.name === datamodelEnum.name),
        )
        .map((datamodelEnum) =>
          normalizeSchemaEnum({
            name: datamodelEnum.name,
            values: datamodelEnum.values.map((v) => v.name),
          }),
        );

      const allModelEnums = [...(mutableEnumTypes.model ?? []), ...transformedDatamodelEnums];
      await generateEnumSchemas(mutableEnumTypes.prisma, allModelEnums);
    } else {
      logger.debug('[prisma-zod-generator] ⏭️  emit.enums=false (skipping enum schemas)');
    }

    // Determine if we should generate ONLY pure models (skip base/object/result schemas)
    // Conditions:
    //  - Single-file mode (user wants a compact bundle)
    //  - pureModels enabled
    //  - All schema variants explicitly disabled (input/result/pure variant system)
    //  - Custom mode (avoid surprising full/minimal modes)
    const variantsCfg = generatorConfig.variants as
      | Record<string, { enabled?: boolean }>
      | undefined;
    const allVariantsDisabled = variantsCfg
      ? Object.values(variantsCfg).every((v) => !v?.enabled)
      : true; // if absent, treat as disabled for this heuristic
    // New heuristic: when pureModels enabled AND all schema variants disabled in custom mode, emit ONLY pure model schemas
    // independent of single vs multi-file mode. This avoids generating enums/objects/CRUD scaffolding the user does not want.
    const pureModelsOnlyMode =
      !!generatorConfig.pureModels && allVariantsDisabled && generatorConfig.mode === 'custom';
    if (pureModelsOnlyMode) {
      logger.debug('[prisma-zod-generator] 🎯 Pure-models-only mode active (variants disabled)');
    }

    // New: treat configuration with only pure variant enabled (input/result disabled) as intent to suppress CRUD/input/result schemas
    interface SimpleVariantCfg {
      enabled?: boolean;
    }
    type VariantsShape = Record<string, SimpleVariantCfg | undefined> & {
      pure?: SimpleVariantCfg;
      input?: SimpleVariantCfg;
      result?: SimpleVariantCfg;
    };
    const asVariants: VariantsShape | undefined = variantsCfg as VariantsShape | undefined;
    const pureVariantOnlyMode =
      !!generatorConfig.pureModels &&
      !pureModelsOnlyMode &&
      !!asVariants &&
      !Array.isArray(asVariants) &&
      asVariants.pure?.enabled === true &&
      asVariants.input?.enabled === false &&
      asVariants.result?.enabled === false;
    if (pureVariantOnlyMode) {
      logger.debug(
        '[prisma-zod-generator] 🎯 Pure-variant-only mode active (skipping CRUD/input/result schemas)',
      );
    }

    // Validate filtering configuration and provide feedback
    const validationResult = Transformer.validateFilterCombinations(models);
    if (!validationResult.isValid) {
      console.error('❌ Configuration validation failed:');
      validationResult.errors.forEach((error) => console.error(`  - ${error}`));
      throw new Error('Invalid filtering configuration. Please fix the errors above.');
    }
    if (validationResult.warnings.length > 0) {
      const header = '[prisma-zod-generator] ⚠️  Configuration warnings (debug):';
      logger.debug(header);
      validationResult.warnings.forEach((warning) => {
        const line = `[prisma-zod-generator]   - ${warning}`;
        logger.debug(line);
      });
    }
    if (validationResult.suggestions.length > 0) {
      logger.debug('💡 Suggestions:');
      validationResult.suggestions.forEach((suggestion) => logger.debug(`  - ${suggestion}`));
    }

    // JSON Schema compatibility mode notification
    if (generatorConfig.jsonSchemaCompatible) {
      logger.debug('[prisma-zod-generator] ℹ️ JSON Schema compatibility mode enabled');
      logger.debug(
        '[prisma-zod-generator]   - DateTime fields: string regex validation (no runtime conversion)',
      );
      logger.debug('[prisma-zod-generator]   - BigInt fields: string or number representation');
      logger.debug(
        '[prisma-zod-generator]   - All transforms removed for z.toJSONSchema() compatibility',
      );
      logger.debug('[prisma-zod-generator]   - Test with: z.toJSONSchema(YourSchema)');
    }

    // Merge backward compatibility options with new configuration
    // Priority: 1. Legacy generator options, 2. New config file options (addSelectType/addIncludeType)
    // Resolve dual-export controls with proper precedence:
    // 1) Prisma generator block (extendedOptions.raw)
    // 2) JSON config (generatorConfig)
    // 3) Defaults
    const cfgAny = generatorConfig as unknown as Record<string, unknown>;
    const exportTypedFromGenOpt = extendedOptions.raw?.exportTypedSchemas;
    const exportTypedFromJson = cfgAny.exportTypedSchemas as boolean | string | undefined;
    const exportZodFromGenOpt = extendedOptions.raw?.exportZodSchemas;
    const exportZodFromJson = cfgAny.exportZodSchemas as boolean | string | undefined;
    const typedSuffixFromGenOpt = extendedOptions.raw?.typedSchemaSuffix;
    const typedSuffixFromJson = cfgAny.typedSchemaSuffix as string | undefined;
    const zodSuffixFromGenOpt = extendedOptions.raw?.zodSchemaSuffix;
    const zodSuffixFromJson = cfgAny.zodSchemaSuffix as string | undefined;

    const toBoolString = (v: unknown): string | undefined => {
      if (v === undefined) return undefined;
      if (typeof v === 'string') {
        const lc = v.trim().toLowerCase();
        if (lc === 'true') return 'true';
        if (lc === 'false') return 'false';
        // Non-empty strings treated as truthy (defensive); but prefer explicit true/false in docs
        return lc ? 'true' : undefined;
      }
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      return undefined;
    };

    const backwardCompatibleOptions = {
      isGenerateSelect:
        extendedOptions.isGenerateSelect?.toString() ||
        (generatorConfig.addSelectType !== undefined
          ? generatorConfig.addSelectType.toString()
          : 'true'),
      isGenerateInclude:
        extendedOptions.isGenerateInclude?.toString() ||
        (generatorConfig.addIncludeType !== undefined
          ? generatorConfig.addIncludeType.toString()
          : 'true'),
      exportTypedSchemas:
        toBoolString(exportTypedFromGenOpt) ?? toBoolString(exportTypedFromJson) ?? 'true',
      exportZodSchemas:
        toBoolString(exportZodFromGenOpt) ?? toBoolString(exportZodFromJson) ?? 'true',
      typedSchemaSuffix: typedSuffixFromGenOpt ?? typedSuffixFromJson ?? 'Schema',
      zodSchemaSuffix: zodSuffixFromGenOpt ?? zodSuffixFromJson ?? 'ZodSchema',
    };

    const addMissingInputObjectTypeOptions =
      resolveAddMissingInputObjectTypeOptions(backwardCompatibleOptions);

    const mutableInputObjectTypes = Array.from(inputObjectTypes ?? []);
    const mutableOutputObjectTypes = Array.from(outputObjectTypes ?? []);

    addMissingInputObjectTypes(
      mutableInputObjectTypes,
      mutableOutputObjectTypes,
      models,
      mutableModelOperations,
      dataSource.provider,
      addMissingInputObjectTypeOptions,
    );

    // Set dual export configuration options on Transformer
    // In minimal mode, forcibly disable select/include types regardless of legacy flags
    const minimalMode = generatorConfig.mode === 'minimal';

    if (minimalMode) {
      const legacySelect = extendedOptions.isGenerateSelect;
      const legacyInclude = extendedOptions.isGenerateInclude;
      const cfgSelect = generatorConfig.addSelectType;
      const cfgInclude = generatorConfig.addIncludeType;

      if (legacySelect === true || cfgSelect === true) {
        // Use info-level to ensure visibility in Prisma CLI output
        logger.info(
          '[prisma-zod-generator] ⚠️  Minimal mode active: Select schemas will be disabled even if enabled by legacy flags or config.',
        );
      }
      if (legacyInclude === true || cfgInclude === true) {
        // Use info-level to ensure visibility in Prisma CLI output
        logger.info(
          '[prisma-zod-generator] ⚠️  Minimal mode active: Include schemas will be disabled even if enabled by legacy flags or config.',
        );
      }
    }
    Transformer.setIsGenerateSelect(
      minimalMode ? false : addMissingInputObjectTypeOptions.isGenerateSelect,
    );
    Transformer.setIsGenerateInclude(
      minimalMode ? false : addMissingInputObjectTypeOptions.isGenerateInclude,
    );
    Transformer.setExportTypedSchemas(addMissingInputObjectTypeOptions.exportTypedSchemas);
    Transformer.setExportZodSchemas(addMissingInputObjectTypeOptions.exportZodSchemas);
    Transformer.setTypedSchemaSuffix(addMissingInputObjectTypeOptions.typedSchemaSuffix);
    Transformer.setZodSchemaSuffix(addMissingInputObjectTypeOptions.zodSchemaSuffix);

    hideInputObjectTypesAndRelatedFields(mutableInputObjectTypes, hiddenModels, hiddenFields);

    // Determine explicit emission flags with fallbacks
    const emitObjects = generatorConfig.emit?.objects !== false;
    const emitCrud = generatorConfig.emit?.crud !== false;
    const emitResultsExplicit = generatorConfig.emit?.results;
    const emitPureModels = generatorConfig.emit?.pureModels ?? !!generatorConfig.pureModels;
    const emitVariants = generatorConfig.emit?.variants !== false; // variants wrapper/index

    // If enums skipped but objects/crud requested, log warning
    if (!emitEnums && (emitObjects || emitCrud)) {
      logger.warn(
        '[prisma-zod-generator] ⚠️  emit.enums=false may break object/CRUD schemas referencing enums.',
      );
    }

    const shouldSkipCrudAndObjectsDueToHeuristics = pureModelsOnlyMode || pureVariantOnlyMode;

    // Minimal mode: keep objects/CRUD enabled, but generation is constrained elsewhere:
    //  - object schemas gated by isObjectSchemaEnabled (only basic Where*/Create*/Update*/OrderBy*Relation)
    //  - operations gated by Transformer.isOperationEnabled (only find/create/update by default)
    if (minimalMode) {
      logger.debug(
        '[prisma-zod-generator] ⚡ Minimal mode: emitting limited objects and CRUD (findUnique/findFirst/findMany + create/update/delete only)',
      );
    }

    if (emitObjects && !shouldSkipCrudAndObjectsDueToHeuristics) {
      await generateObjectSchemas(mutableInputObjectTypes, models);
    } else if (!emitObjects) {
      logger.debug('[prisma-zod-generator] ⏭️  emit.objects=false (skipping object/input schemas)');
    }

    if (emitCrud && !shouldSkipCrudAndObjectsDueToHeuristics) {
      await generateModelSchemas(models, mutableModelOperations);
    } else if (!emitCrud) {
      logger.debug('[prisma-zod-generator] ⏭️  emit.crud=false (skipping CRUD operation schemas)');
    }

    // Only create objects index if objects or crud emitted (legacy expectation)
    if ((emitObjects || emitCrud) && !shouldSkipCrudAndObjectsDueToHeuristics) {
      await generateIndex();
    }

    if (emitPureModels) {
      logger.debug(
        `[debug] Before pure model generation: pureModels=${String(generatorConfig.pureModels || emitPureModels)} namingPreset=${generatorConfig.naming?.preset || 'none'}`,
      );
      await generatePureModelSchemas(models, generatorConfig);
    } else {
      logger.debug(
        '[prisma-zod-generator] ⏭️  emit.pureModels=false (skipping pure model schemas)',
      );
    }

    if (emitVariants) {
      await generateVariantSchemas(models, generatorConfig);
      if (!singleFileMode) {
        await updateIndexWithVariants(generatorConfig);
      }
    } else {
      logger.debug(
        '[prisma-zod-generator] ⏭️  emit.variants=false (skipping variant wrapper schemas)',
      );
    }

    // Result schemas are generated inside Transformer.generateResultSchemas; we guard via emit.results if specified
    if (emitResultsExplicit === false) {
      // Monkey patch config variants.result.enabled to false to unify gating pathway safely
      const variantsRef: Record<string, { enabled?: boolean }> =
        (generatorConfig.variants as Record<string, { enabled?: boolean }>) ||
        ((generatorConfig as { variants?: Record<string, { enabled?: boolean }> }).variants =
          {} as Record<string, { enabled?: boolean }>);
      const resultVariantRef: { enabled?: boolean } =
        variantsRef.result || (variantsRef.result = {} as { enabled?: boolean });
      resultVariantRef.enabled = false;
      logger.debug(
        '[prisma-zod-generator] ⏭️  emit.results=false (forcing skip of result schemas)',
      );
    }

    if (!(pureModelsOnlyMode || pureVariantOnlyMode)) {
      generateFilteringSummary(models, generatorConfig);
    }

    // If single-file mode is enabled, flush aggregator and clean directory around the bundle
    if (singleFileMode) {
      await flushSingleFile();
      const placeAtRoot = generatorConfig.placeSingleFileAtRoot !== false; // default true
      const baseDir = placeAtRoot ? Transformer.getOutputPath() : Transformer.getSchemasPath();
      const bundleName = (generatorConfig.singleFileName || 'schemas.ts').trim();
      const bundlePath = path.join(baseDir, bundleName);

      // Add the single file to the manifest
      const manifest = Transformer.getCurrentManifest();
      if (manifest) {
        addFileToManifest(manifest, bundlePath, Transformer.getOutputPath());
      }
      try {
        const entries = await fs.readdir(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(baseDir, entry.name);
          if (full === bundlePath) continue;
          if (entry.isDirectory()) {
            await fs.rm(full, { recursive: true, force: true });
          } else {
            await fs.unlink(full);
          }
        }
      } catch {}
    }

    // Save the manifest at the end of generation
    const finalManifest = Transformer.getCurrentManifest();
    if (finalManifest && resolvedSafetyConfig && !resolvedSafetyConfig.skipManifest) {
      await saveManifest(Transformer.getOutputPath(), finalManifest);
    } else if (resolvedSafetyConfig?.skipManifest) {
      logger.debug('[prisma-generator] Skipping manifest save (skipManifest enabled)');
    }

    maybeShowSponsorMessage();
  } catch (error) {
    console.error(error);
  }
}

function getGeneratorConfigByProvider(generators: GeneratorConfig[], provider: string) {
  return generators.find((it) => parseEnvValue(it.provider) === provider);
}

function checkForCustomPrismaClientOutputPath(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
  schemaBaseDir: string,
) {
  const outputValue = prismaClientGeneratorConfig?.output?.value as string | undefined;
  const isCustomOutput = Boolean(prismaClientGeneratorConfig?.isCustomOutput);
  const provider = prismaClientGeneratorConfig?.provider
    ? parseEnvValue(prismaClientGeneratorConfig.provider)
    : undefined;

  const looksLikeNodeModulesPath = Boolean(outputValue && outputValue.includes('node_modules'));
  const shouldUseCustomPath = Boolean(isCustomOutput && outputValue && !looksLikeNodeModulesPath);

  if (shouldUseCustomPath) {
    const rawOutput = outputValue as string;
    const normalizedOutput = path.isAbsolute(rawOutput)
      ? path.normalize(rawOutput)
      : path.resolve(schemaBaseDir, rawOutput);
    Transformer.setPrismaClientOutputPath(normalizedOutput);
    return;
  }

  // New generator may require an explicit output path when users customize it; otherwise fall back
  // to the default package entrypoint just like prisma-client-js.
  Transformer.setPrismaClientOutputPath('@prisma/client');
}

function setPrismaClientProvider(prismaClientGeneratorConfig: GeneratorConfig | undefined) {
  if (prismaClientGeneratorConfig?.provider) {
    Transformer.setPrismaClientProvider(parseEnvValue(prismaClientGeneratorConfig.provider));
  }
}

function setPrismaClientConfig(prismaClientGeneratorConfig: GeneratorConfig | undefined) {
  if (prismaClientGeneratorConfig?.config) {
    Transformer.setPrismaClientConfig(prismaClientGeneratorConfig.config);
  }
}

function maybeWarnOnUnsupportedPrismaVersion(options: GeneratorOptions) {
  const version = options.version || detectInstalledPrismaVersion(options.schemaPath);
  if (!version) return;

  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  if (!Number.isFinite(major)) return;

  if (major < 7) {
    logger.warn(
      `[prisma-zod-generator] ⚠️ Detected prisma@${version}, but this release requires Prisma >=7.\n` +
        'Please pin prisma-zod-generator to ^1.32.1 while you remain on Prisma 6, or upgrade Prisma before using 2.x.',
    );
  }
}

function detectInstalledPrismaVersion(schemaPath: string): string | undefined {
  try {
    const req = createRequire(schemaPath);
    const pkg = req('prisma/package.json') as { version?: string };
    return pkg?.version;
  } catch {
    return undefined;
  }
}

function normalizeSchemaEnum(enumType: {
  name: string;
  values?: readonly unknown[];
  data?: readonly { key: string; value: string }[];
}): SchemaEnumWithValues {
  const rawValues = Array.isArray(enumType.values) ? Array.from(enumType.values) : undefined;
  const values = rawValues
    ? rawValues.map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && 'name' in (v as Record<string, unknown>)) {
          return (v as { name: string }).name;
        }
        if (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
          return (v as { value: string }).value;
        }
        return String(v);
      })
    : Array.isArray(enumType.data)
      ? Array.from(enumType.data).map((entry) => entry.value || entry.key)
      : [];

  const data = enumType.data
    ? Array.from(enumType.data)
    : values.map((val) => ({ key: val, value: val }));

  return {
    name: enumType.name,
    data,
    values,
  };
}

async function generateEnumSchemas(
  prismaSchemaEnum: SchemaEnumWithValues[],
  modelSchemaEnum: SchemaEnumWithValues[],
) {
  const enumTypes = [...prismaSchemaEnum, ...modelSchemaEnum];
  // Include both raw and normalized enum names so import/name checks work
  const rawEnumNames = enumTypes.map((e) => e.name);

  // Mirror Transformer.normalizeEnumName logic locally to avoid surfacing private APIs
  const modelEnumPatterns = [/^(\w+)ScalarFieldEnum$/, /^(\w+)OrderByRelevanceFieldEnum$/];
  const toPascalCase = (modelName: string): string =>
    modelName
      .replace(/[_-\s]+(.)?/g, (_: string, c: string) => (c ? c.toUpperCase() : ''))
      .replace(/^\w/, (c) => c.toUpperCase());
  const normalizeEnumNameForRegistry = (name: string): string | null => {
    for (const pattern of modelEnumPatterns) {
      const match = name.match(pattern);
      if (match) {
        const modelName = match[1];
        return name.replace(modelName, toPascalCase(modelName));
      }
    }
    return null;
  };

  const normalizedEnumNames = enumTypes
    .map((e) => normalizeEnumNameForRegistry(e.name) ?? e.name)
    .filter(Boolean) as string[];

  const combinedEnumNames = Array.from(new Set([...rawEnumNames, ...normalizedEnumNames]));
  Transformer.enumNames = combinedEnumNames;
  const transformer = new Transformer({
    enumTypes,
  });
  await transformer.generateEnumSchemas();
}

async function generateObjectSchemas(inputObjectTypes: DMMF.InputType[], models: DMMF.Model[]) {
  // Debug: List all UpdateManyWithWhere types in DMMF
  const updateManyWithWhereTypes = inputObjectTypes.filter((t) =>
    t.name.includes('UpdateManyWithWhere'),
  );
  logger.debug(
    `\n🔍 DEBUG: Found ${updateManyWithWhereTypes.length} UpdateManyWithWhere types in DMMF:`,
  );
  updateManyWithWhereTypes.forEach((t) => {
    logger.debug(`  - ${t.name}: fields [${t.fields.map((f) => f.name).join(', ')}]`);
  });

  for (let i = 0; i < inputObjectTypes.length; i += 1) {
    const originalFields = inputObjectTypes[i]?.fields;
    const name = inputObjectTypes[i]?.name;

    // Debug specific type
    if (name === 'PostUpdateManyWithWhereWithoutAuthorInput') {
      logger.debug(`\n🔍 DEBUG: Found ${name}`);
      logger.debug(`Fields: ${originalFields?.map((f) => f.name).join(', ')}`);
      originalFields?.forEach((field) => {
        logger.debug(`  - ${field.name}: ${field.inputTypes.map((t) => t.type).join(' | ')}`);
      });
    }

    // Filter object schemas based on enabled models
    if (name && !isObjectSchemaEnabled(name)) {
      logger.debug(`[DEBUG] Skipping object schema: ${name} (disabled by config)`);
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
        filteredFields = Transformer.filterFields(
          [...originalFields],
          modelName,
          variant,
          models,
          name,
        );
      }
    }

    const transformer = new Transformer({ name, fields: filteredFields, models });
    await transformer.generateObjectSchema();
  }
}

/**
 * Check if an object schema should be generated based on enabled models and operations
 */
function isObjectSchemaEnabled(objectSchemaName: string): boolean {
  // Always allow scalar/enum filter and field update helper schemas
  const helperTypePatterns = [
    // Basic filters and their nullable variants
    /^(?:String|Int|Float|Decimal|BigInt|Bool|Boolean|DateTime|Bytes|Json)(?:Nullable)?Filter$/,
    // Enum filters (e.g., EnumRoleNullableFilter, EnumRoleFilter)
    /^Enum\w+(?:Nullable)?Filter$/,
    // WithAggregates variants
    /^(?:String|Int|Float|Decimal|BigInt|Bool|Boolean|DateTime|Bytes|Json)(?:Nullable)?WithAggregatesFilter$/,
    /^Enum\w+(?:Nullable)?WithAggregatesFilter$/,
    // Nested filters
    /^Nested\w+(?:Nullable)?(?:WithAggregates)?Filter$/,
    // Field update operation inputs (e.g., NullableBytesFieldUpdateOperationsInput)
    /^(?:Nullable)?\w+FieldUpdateOperationsInput$/,
  ];
  if (helperTypePatterns.some((p) => p.test(objectSchemaName))) {
    logger.debug(`🔍 Helper schema allowed: ${objectSchemaName}`);
    return true;
  }

  // Extract potential model name from object schema name
  const modelName = extractModelNameFromObjectSchema(objectSchemaName);

  // In minimal mode, suppress complex/nested input schemas proactively
  const cfg = Transformer.getGeneratorConfig();
  if (cfg?.mode === 'minimal') {
    // Allow-list of basic inputs still needed in minimal mode (covers find/create/update/delete)
    const allowedBasics = [
      /WhereInput$/,
      /WhereUniqueInput$/,
      /UncheckedCreateInput$/, // Prefer UncheckedCreateInput over CreateInput in minimal mode
      /UpdateInput$/, // Allow UpdateInput for update operations
      /UncheckedUpdateInput$/, // Also allow UncheckedUpdateInput variants
      /UpdateManyMutationInput$/, // Allow UpdateMany mutation inputs
      /OrderByWithRelationInput$/,
    ];
    if (allowedBasics.some((p) => p.test(objectSchemaName))) {
      // Special case: CreateMany inputs are heavier; only allow when explicitly requested
      if (/CreateManyInput$/.test(objectSchemaName)) {
        const ops = (cfg as unknown as { minimalOperations?: string[] }).minimalOperations;
        const allowCreateMany = Array.isArray(ops)
          ? ops.includes('createMany') || ops.includes('create')
          : false; // default off in pure minimal mode
        if (!allowCreateMany) {
          logger.debug(
            `⏭️  Minimal mode: skipping heavy ${objectSchemaName} (no createMany in ops)`,
          );
          return false;
        }
      }
      // continue to further checks below (model/ops) but do not block by minimal-mode rules
    } else {
      const disallowedPatterns = [
        // Block Include/Select helper schemas entirely in minimal mode
        /Args$/,
        /Include$/,
        /Select$/,
        /OrderByWithAggregationInput$/,
        /ScalarWhereWithAggregatesInput$/,
        /CountAggregateInput$/,
        /AvgAggregateInput$/,
        /SumAggregateInput$/,
        /MinAggregateInput$/,
        /MaxAggregateInput$/,
        // Block regular CreateInput in favor of Unchecked variants in minimal mode
        /(?<!Unchecked)CreateInput$/,
        // Deep or relation-heavy object inputs
        /CreateNested\w+Input$/,
        /UpdateNested\w+Input$/,
        /UpsertNested\w+Input$/,
        /CreateWithout\w+Input$/,
        /UncheckedCreateWithout\w+Input$/,
        /UpdateWithout\w+Input$/,
        /UncheckedUpdateWithout\w+Input$/,
        /UpsertWithout\w+Input$/,
        /UpdateManyWithout\w+NestedInput$/,
        /UncheckedUpdateManyWithout\w+NestedInput$/,
        /CreateMany\w+InputEnvelope$/,
        /ListRelationFilter$/,
        /RelationFilter$/,
        /ScalarRelationFilter$/,
        // Block schemas that depend on blocked Without schemas
        /CreateOrConnectWithout\w+Input$/,
        /CreateManyWithout\w+Input$/,
        /UpdateToOneWithWhereWithout\w+Input$/,
        /UpdateOneWithout\w+NestedInput$/,
        /UpdateOneRequiredWithout\w+NestedInput$/,
        /UpdateManyWithWhereWithout\w+Input$/,
        /UpdateWithWhereUniqueWithout\w+Input$/,
      ];
      if (disallowedPatterns.some((p) => p.test(objectSchemaName))) {
        logger.debug(`⏭️  Minimal mode: skipping object schema ${objectSchemaName}`);
        return false;
      }
    }
  }

  if (modelName) {
    // First check if the model itself is enabled
    const isModelEnabled = Transformer.isModelEnabled(modelName);
    logger.debug(
      `🔍 Object schema check: ${objectSchemaName} -> model: ${modelName}, enabled: ${isModelEnabled}`,
    );
    if (!isModelEnabled) {
      return false;
    }

    // Then check if any operations that use this schema are enabled
    const requiredOperations = getRequiredOperationsForObjectSchema(objectSchemaName);
    if (requiredOperations.length > 0) {
      // If we can determine required operations, check if any of them are enabled
      const hasEnabledOperation = requiredOperations.some((operation) =>
        Transformer.isOperationEnabled(modelName, operation),
      );
      logger.debug(
        `🔍 Operation check: ${objectSchemaName} -> operations: ${requiredOperations}, hasEnabled: ${hasEnabledOperation}`,
      );
      return hasEnabledOperation;
    }
  }

  // Previously, some filter/update helper types were treated as "phantom" and skipped.
  // In Prisma v6 these do exist (e.g., BytesNullableFilter, NullableBytesFieldUpdateOperationsInput, EnumRoleNullableFilter).
  // Do not skip them here; generation must include these to satisfy typed Zod unions.

  // If we can't determine the model or operations, generate the schema (default behavior)
  logger.debug(
    `🔍 Default behavior: ${objectSchemaName} -> generating (could not determine model)`,
  );
  return true;
}

/**
 * Get the operations that require a specific object schema
 */
function getRequiredOperationsForObjectSchema(objectSchemaName: string): string[] {
  // Map object schema patterns to the operations that use them
  const operationMappings = [
    // Create operations
    {
      patterns: [/CreateInput$/, /UncheckedCreateInput$/, /CreateManyInput$/],
      operations: ['createOne', 'createMany'],
    },
    {
      patterns: [/CreateWithout\w+Input$/, /UncheckedCreateWithout\w+Input$/],
      operations: ['createOne'],
    },
    {
      patterns: [/CreateNestedOneWithout\w+Input$/, /CreateNestedManyWithout\w+Input$/],
      operations: ['createOne'],
    },
    { patterns: [/CreateOrConnectWithout\w+Input$/], operations: ['createOne'] },

    // Update operations
    {
      patterns: [
        /UpdateInput$/,
        /UncheckedUpdateInput$/,
        /UpdateManyInput$/,
        /UncheckedUpdateManyInput$/,
      ],
      operations: ['updateOne', 'updateMany'],
    },
    { patterns: [/UpdateManyMutationInput$/], operations: ['updateMany'] },
    {
      patterns: [/UpdateWithout\w+Input$/, /UncheckedUpdateWithout\w+Input$/],
      operations: ['updateOne'],
    },
    {
      patterns: [/UpdateNestedOneWithout\w+Input$/, /UpdateNestedManyWithout\w+Input$/],
      operations: ['updateOne'],
    },
    {
      patterns: [/UpdateOneRequiredWithout\w+NestedInput$/, /UpdateToOneWithWhereWithout\w+Input$/],
      operations: ['updateOne'],
    },
    {
      patterns: [/UpdateManyWithWhereWithout\w+Input$/, /UpdateWithWhereUniqueWithout\w+Input$/],
      operations: ['updateOne'],
    },
    { patterns: [/UpdateManyWithout\w+NestedInput$/], operations: ['updateOne'] },

    // Upsert operations
    {
      patterns: [
        /UpsertWithout\w+Input$/,
        /UpsertNestedOneWithout\w+Input$/,
        /UpsertNestedManyWithout\w+Input$/,
      ],
      operations: ['upsertOne'],
    },
    { patterns: [/UpsertWithWhereUniqueWithout\w+Input$/], operations: ['upsertOne'] },

    // Delete operations (through where clauses)
    {
      patterns: [/WhereInput$/, /WhereUniqueInput$/],
      operations: [
        'findMany',
        'findUnique',
        'findFirst',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
        'upsertOne',
      ],
    },
    { patterns: [/ScalarWhereInput$/], operations: ['updateMany', 'deleteMany'] },

    // Aggregate operations
    {
      patterns: [
        /CountAggregateInput$/,
        /AvgAggregateInput$/,
        /MaxAggregateInput$/,
        /MinAggregateInput$/,
        /SumAggregateInput$/,
      ],
      operations: ['aggregate'],
    },
    {
      patterns: [/OrderByWithAggregationInput$/, /ScalarWhereWithAggregatesInput$/],
      operations: ['groupBy'],
    },
    {
      patterns: [
        /CountOrderByAggregateInput$/,
        /AvgOrderByAggregateInput$/,
        /MaxOrderByAggregateInput$/,
        /MinOrderByAggregateInput$/,
        /SumOrderByAggregateInput$/,
      ],
      operations: ['groupBy'],
    },

    // Order by inputs
    { patterns: [/OrderByWithRelationInput$/], operations: ['findMany', 'findFirst'] },
    { patterns: [/OrderByRelationAggregateInput$/], operations: ['findMany', 'findFirst'] },

    // Filter inputs
    {
      patterns: [/ListRelationFilter$/, /RelationFilter$/, /ScalarRelationFilter$/],
      operations: [
        'findMany',
        'findUnique',
        'findFirst',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
      ],
    },
  ];

  for (const mapping of operationMappings) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(objectSchemaName)) {
        return mapping.operations;
      }
    }
  }

  // If no specific mapping found, return empty array (will generate by default)
  return [];
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

    // Filter types - handle these specially as they may be phantom types
    /^Enum(\w+)NullableFilter$/,
    /^Enum(\w+)Filter$/,
    /^(\w+)NullableFilter$/,
    /^(\w+)Filter$/,
  ];

  for (const pattern of patterns) {
    const match = objectSchemaName.match(pattern);
    if (match) {
      // Special handling for Enum filter types
      if (pattern.source.includes('Enum')) {
        return match[1]; // Returns 'Role' from 'EnumRoleNullableFilter'
      }
      return match[1];
    }
  }

  return null;
}

async function generateModelSchemas(models: DMMF.Model[], modelOperations: DMMF.ModelMapping[]) {
  // Filter models and operations based on configuration before transformation
  const enabledModels = models.filter((model) => Transformer.isModelEnabled(model.name));
  const enabledModelOperations = modelOperations.filter((operation) =>
    Transformer.isModelEnabled(operation.model),
  );

  const transformer = new Transformer({
    models: enabledModels,
    modelOperations: enabledModelOperations,
  });
  await transformer.generateModelSchemas();
  await transformer.generateResultSchemas();
  // Ensure objects index exists for integration expectations
  await generateObjectsIndex();
}

async function generateIndex() {
  await Transformer.generateIndex();
}

/**
 * Generate an index.ts inside the objects directory and add it to the main index
 */
async function generateObjectsIndex() {
  try {
    const schemasPath = Transformer.getSchemasPath();
    const objectsDir = path.join(schemasPath, 'objects');

    // Ensure directory exists; if not, nothing to do
    try {
      await fs.mkdir(objectsDir, { recursive: true });
    } catch {}

    // Read all .ts files in objects directory (excluding index)
    let entries: string[] = [];
    try {
      const dirents = await fs.readdir(objectsDir, { withFileTypes: true });
      entries = dirents
        .filter((d) => d.isFile() && d.name.endsWith('.ts') && d.name !== 'index.ts')
        .map((d) => d.name.replace(/\.ts$/, ''));
    } catch {
      // If reading fails, skip creating index content
      entries = [];
    }

    const importExtension = Transformer.getImportFileExtension();
    const exportLines = entries.map((base) => `export * from './${base}${importExtension}';`);
    const content = [
      '/**',
      ' * Object Schemas Index',
      ' * Auto-generated - do not edit manually',
      ' */',
      '',
      ...exportLines,
      '',
    ].join('\n');

    const indexPath = path.join(objectsDir, 'index.ts');
    // Write without formatting overhead
    await fs.writeFile(indexPath, content);

    // Add objects index to the main index exports
    const { addIndexExport } = await import('./utils/writeIndexFile');
    addIndexExport(indexPath);
  } catch (err) {
    console.error('⚠️  Failed to generate objects index:', err);
  }
}

async function updateIndexWithVariants(config: CustomGeneratorConfig) {
  // Check if variants are enabled and add variants export to main index
  const variants = config.variants;
  if (!variants) return;

  // If variants are array-based and explicitly placed at root, skip variants barrel export
  if (Array.isArray(variants)) {
    const placeAtRoot = config.placeArrayVariantsAtRoot === true; // default false
    if (placeAtRoot) return;
    // else proceed to add variants/index.ts below
  }

  const enabledVariants = Object.entries(variants)
    .filter(([_, variantConfig]) => variantConfig?.enabled)
    .map(([variantName]) => variantName);

  if (enabledVariants.length === 0) return;

  // Import the addIndexExport function and add the variants directory only if it exists
  const { addIndexExport, writeIndexFile } = await import('./utils/writeIndexFile');
  const variantsIndexPath = path.join(Transformer.getSchemasPath(), 'variants', 'index.ts');

  // Check if the variants directory and index file actually exist before adding the export
  const fs = await import('fs');
  if (fs.existsSync(variantsIndexPath)) {
    // Add the variants export to the main index
    addIndexExport(variantsIndexPath);
  }

  // Regenerate the main index file to include all exports
  // Use the same path resolution as the transformer to avoid path mismatches
  const indexPath = path.join(Transformer.getSchemasPath(), 'index.ts');
  const importExtension = Transformer.getImportFileExtension();
  await writeIndexFile(indexPath, importExtension);

  logger.debug('📦 Updated main index to include variants export');
}

/**
 * Generate summary of filtering configuration and results
 */
function generateFilteringSummary(models: DMMF.Model[], config: CustomGeneratorConfig) {
  const totalModels = models.length;
  const enabledModels = models.filter((model) => Transformer.isModelEnabled(model.name));
  const enabledModelCount = enabledModels.length;
  const disabledModelCount = totalModels - enabledModelCount;

  logger.debug('\n📊 Generation Summary:');
  logger.debug(`   Models: ${enabledModelCount}/${totalModels} enabled`);

  if (disabledModelCount > 0) {
    const disabledModels = models
      .filter((model) => !Transformer.isModelEnabled(model.name))
      .map((model) => model.name);
    logger.debug(`   Disabled models: ${disabledModels.join(', ')}`);
  }

  // Show configuration mode
  if (config.mode) {
    logger.debug(`   Mode: ${config.mode}`);
  }

  // Show global exclusions if any
  const globalExclusions = config.globalExclusions;
  if (globalExclusions && Object.values(globalExclusions).some((arr) => arr && arr.length > 0)) {
    logger.debug('   Global exclusions:');
    Object.entries(globalExclusions).forEach(([variant, fields]) => {
      if (fields && fields.length > 0) {
        logger.debug(`     ${variant}: ${fields.join(', ')}`);
      }
    });
  }

  // Show model-specific configurations if any
  const modelConfigs = config.models;
  if (modelConfigs && Object.keys(modelConfigs).length > 0) {
    const configuredModels = Object.keys(modelConfigs).filter((modelName) =>
      Transformer.isModelEnabled(modelName),
    );
    if (configuredModels.length > 0) {
      logger.debug(`   Custom configurations: ${configuredModels.length} models`);
    }
  }

  logger.info('✅ Zod schemas generated successfully with filtering applied\n');
}

/**
 * Merge configuration with proper precedence handling
 * Generator options override config file options
 */

/**
 */
function mergeConfigurationWithPrecedence(
  configFileOptions: Partial<CustomGeneratorConfig>,
  generatorOverrides: Partial<CustomGeneratorConfig>,
): Partial<CustomGeneratorConfig> {
  const result = { ...configFileOptions };

  // Apply generator overrides with proper deep merging for nested objects
  Object.keys(generatorOverrides).forEach((key) => {
    const override = generatorOverrides[key as keyof CustomGeneratorConfig];
    const existing = result[key as keyof CustomGeneratorConfig];

    if (override !== undefined) {
      if (
        key === 'variants' &&
        existing &&
        typeof existing === 'object' &&
        override &&
        typeof override === 'object'
      ) {
        // Special handling for variants - merge nested objects with proper typing
        result.variants = {
          ...(existing as CustomGeneratorConfig['variants']),
          ...(override as CustomGeneratorConfig['variants']),
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
  generatorOverrides: Partial<CustomGeneratorConfig>,
): void {
  const hasConfigFile = Object.keys(configFileOptions).length > 0;
  const hasGeneratorOverrides = Object.keys(generatorOverrides).length > 0;

  if (hasConfigFile || hasGeneratorOverrides) {
    logger.debug('🔧 Configuration precedence applied:');

    if (hasConfigFile) {
      logger.debug('   📁 Config file options loaded');
    }

    if (hasGeneratorOverrides) {
      logger.debug('   ⚡ Generator options override:', Object.keys(generatorOverrides).join(', '));
    }

    if (hasConfigFile && hasGeneratorOverrides) {
      logger.debug('   💡 Generator options take precedence over config file settings');
    }

    logger.debug(''); // Empty line for readability
  }
}

/**
 * Warn if file layout options in generator block contradict those in the config file.
 * The generator block wins by precedence, but surfacing this helps avoid confusion
 * like getting more (or fewer) files than expected.
 */
function warnOnFileLayoutConflicts(
  configFileOptions: Partial<CustomGeneratorConfig>,
  generatorOverrides: Partial<CustomGeneratorConfig>,
) {
  const cf = configFileOptions;
  const go = generatorOverrides;

  const conflicts: string[] = [];

  if (
    cf.useMultipleFiles !== undefined &&
    go.useMultipleFiles !== undefined &&
    cf.useMultipleFiles !== go.useMultipleFiles
  ) {
    conflicts.push(
      `useMultipleFiles mismatch: generator block = ${go.useMultipleFiles}, config file = ${cf.useMultipleFiles}. ` +
        `Generator block takes precedence.`,
    );
  }

  if (cf.singleFileName && go.singleFileName && cf.singleFileName !== go.singleFileName) {
    conflicts.push(
      `singleFileName mismatch: generator block = "${go.singleFileName}", config file = "${cf.singleFileName}". ` +
        `Generator block takes precedence.`,
    );
  }

  if (
    cf.placeSingleFileAtRoot !== undefined &&
    go.placeSingleFileAtRoot !== undefined &&
    cf.placeSingleFileAtRoot !== go.placeSingleFileAtRoot
  ) {
    conflicts.push(
      `placeSingleFileAtRoot mismatch: generator block = ${go.placeSingleFileAtRoot}, config file = ${cf.placeSingleFileAtRoot}. ` +
        `Generator block takes precedence.`,
    );
  }

  if (conflicts.length > 0) {
    // Use info-level to ensure visibility in Prisma CLI output
    logger.info(
      '[prisma-zod-generator] ⚠️  File layout conflicts detected. The Prisma generator block takes precedence over JSON config.',
    );
    logger.debug('[prisma-zod-generator] Conflict details:');
    conflicts.forEach((msg) => logger.debug(`  - ${msg}`));
    logger.debug(
      '[prisma-zod-generator] Tip: Align useMultipleFiles, singleFileName, and placeSingleFileAtRoot across sources.',
    );
  }
}

/**
 * Generate variant schemas if variants are enabled in configuration
 */
async function generateVariantSchemas(models: DMMF.Model[], config: CustomGeneratorConfig) {
  // In strict single-file mode, skip generating any variant artifacts entirely.
  if (!isSingleFileEnabled()) {
    // continue
  } else {
    return;
  }
  // Check if variants are configured
  const variants = config.variants;
  if (!variants) return;

  // Support two formats:
  // 1) Object-based variants (pure/input/result)
  // 2) Array-based custom variants [{ name, suffix, exclude, ... }]
  const isArrayVariants = Array.isArray(variants);

  if (isArrayVariants) {
    // Custom array-based variants: generate files directly under variants/ as Model{Suffix}.schema.ts
    try {
      // Default behavior: place array-based variants under schemas/variants unless explicitly configured to place at root
      const placeAtRoot = config.placeArrayVariantsAtRoot === true; // default false
      const variantsOutputPath = placeAtRoot
        ? Transformer.getSchemasPath()
        : path.join(Transformer.getSchemasPath(), 'variants');

      // Filter models based on configuration
      const enabledModels = models.filter((model) => Transformer.isModelEnabled(model.name));
      if (enabledModels.length === 0) {
        logger.warn('⚠️  No models enabled for variant generation');
        return;
      }

      await fs.mkdir(variantsOutputPath, { recursive: true });

      const exportLines: string[] = [];
      const strictModeResolver = createStrictModeResolver(config);

      for (const variantDef of variants as Array<{
        name: string;
        suffix?: string;
        exclude?: string[];
        additionalValidation?: Record<string, string>;
        makeOptional?: string[];
        transformRequiredToOptional?: string[];
        transformOptionalToRequired?: boolean;
        removeValidation?: boolean;
      }>) {
        const suffix: string =
          variantDef.suffix ||
          (variantDef.name
            ? variantDef.name.charAt(0).toUpperCase() + variantDef.name.slice(1)
            : 'Variant');
        const exclude: string[] = Array.isArray(variantDef.exclude) ? variantDef.exclude : [];

        for (const model of enabledModels) {
          const schemaName = `${model.name}${suffix}Schema`;
          const fileBase = `${model.name}${suffix}.schema`;
          const filePath = `${variantsOutputPath}/${fileBase}.ts`;

          // Merge exclusion sources: global, variant, and model-specific
          const modelConfig = config.models?.[model.name] || {};
          const modelVariant = (
            modelConfig?.variants as
              | Record<string, VariantConfig & { exclude?: string[] }>
              | undefined
          )?.[variantDef.name];
          const ge = config.globalExclusions as unknown as Record<string, string[]> | undefined;
          let globalExcludes: string[] = [];
          if (Array.isArray(ge)) {
            globalExcludes = ge as string[];
          } else if (ge && variantDef.name && Array.isArray(ge[variantDef.name])) {
            globalExcludes = ge[variantDef.name] as string[];
          }
          // Apply only legacy model-level excludes globally; variant-specific excludes are applied per-variant below
          const legacyModel = modelConfig as unknown as { fields?: { exclude?: string[] } };
          const baseModelExcludes: string[] = Array.isArray(legacyModel?.fields?.exclude)
            ? legacyModel.fields.exclude
            : [];
          const mv = modelVariant as unknown as
            | { excludeFields?: string[]; exclude?: string[] }
            | undefined;
          const modelExcludes: string[] = [...(mv?.excludeFields || []), ...(mv?.exclude || [])];
          const excludeFields = Array.from(
            new Set([
              ...(exclude || []),
              ...globalExcludes,
              ...baseModelExcludes,
              ...modelExcludes,
            ]),
          );

          // Support simple variant-specific transformations
          const variantNameForRules = variantDef.name || 'input';
          const additionalValidation = (variantDef.additionalValidation || {}) as Record<
            string,
            string
          >;
          const makeOptional: string[] = variantDef.makeOptional || [];
          const transformRequiredToOptional: string[] =
            variantDef.transformRequiredToOptional || [];
          const transformOptionalToRequired: boolean = Boolean(
            variantDef.transformOptionalToRequired,
          );
          const removeValidation: boolean = Boolean(variantDef.removeValidation);

          // Build field definitions with basic rules
          const enabledFields = model.fields.filter((field) => !excludeFields.includes(field.name));
          // Collect enum types used to import enum values from @prisma/client
          const enumTypes = Array.from(
            new Set(
              enabledFields
                .filter((field) => field.kind === 'enum')
                .map((field) => String(field.type)),
            ),
          );
          const fieldLines = enabledFields
            .map((field) => {
              // Base zod type
              let zod =
                field.kind === 'enum'
                  ? `${String(field.type)}Schema`
                  : `z.${getZodTypeForField(field)}`;

              // Apply optionality rules
              const wasRequired = field.isRequired;
              const shouldOptional =
                makeOptional.includes(field.name) ||
                transformRequiredToOptional.includes(field.name) ||
                (!wasRequired && variantNameForRules === 'input');
              if (transformOptionalToRequired && !wasRequired) {
                // force required: do nothing (skip .optional())
              } else if (shouldOptional) {
                zod += '.optional()';
              }

              // Apply validations
              if (!removeValidation) {
                // From config.additionalValidation
                const v = additionalValidation[field.name];
                if (v && typeof v === 'string' && v.startsWith('@zod')) {
                  zod += v.replace('@zod', '');
                }
                // From Prisma field documentation comments (/// @zod...)
                const doc: string | undefined =
                  (field as unknown as { documentation?: string; doc?: string }).documentation ||
                  (field as unknown as { documentation?: string; doc?: string }).doc ||
                  undefined;
                if (doc && doc.includes('@zod')) {
                  // Handle @zod.custom.use() as complete schema replacement
                  const customUseMatch = doc.match(
                    /@zod\.custom\.use\(((?:[^()]|\([^)]*\))*)\)(.*)$/m,
                  );
                  if (customUseMatch) {
                    const baseExpression = customUseMatch[1].trim();
                    const chainedMethods = customUseMatch[2].trim();

                    if (baseExpression) {
                      // Completely replace the base schema with custom expression
                      zod = baseExpression;
                      if (chainedMethods) {
                        zod += chainedMethods;
                      }
                    }
                  } else {
                    // Handle @zod.custom({ ... }) for object/array literals
                    const customMatch = doc.match(
                      /@zod\.custom\(((?:\{[^}]*\}|\[[^\]]*\]|(?:[^()]|\([^)]*\))*?))\)(.*)$/m,
                    );
                    if (customMatch) {
                      const objectExpression = customMatch[1].trim();
                      const chainedMethods = customMatch[2].trim();

                      if (objectExpression) {
                        if (objectExpression.startsWith('{')) {
                          // Convert JSON object to z.object()
                          try {
                            const parsedObject = JSON.parse(objectExpression);
                            const zodObject = convertObjectToZodSchema(parsedObject);
                            zod = `z.object(${zodObject})`;
                          } catch {
                            // If JSON parsing fails, preserve the raw expression
                            zod = `z.object(${objectExpression})`;
                          }
                        } else if (objectExpression.startsWith('[')) {
                          // Convert JSON array to z.array()
                          try {
                            const parsedArray = JSON.parse(objectExpression);
                            const zodArray = convertArrayToZodSchema(parsedArray);
                            zod = `z.array(${zodArray})`;
                          } catch {
                            // If JSON parsing fails, preserve the raw expression
                            zod = `z.array(${objectExpression})`;
                          }
                        } else {
                          // For other expressions, use them directly
                          zod = objectExpression;
                        }

                        // Add any chained methods
                        if (chainedMethods) {
                          zod += chainedMethods;
                        }
                      }
                    } else {
                      // Regular @zod annotation processing
                      const m = doc.match(/@zod(.*)$/m);
                      if (m && m[1]) {
                        zod += m[1];
                      }
                    }
                  }
                }
              }

              // Nullable for optional string in input
              if (!field.isRequired && field.type === 'String') {
                zod += '.nullable()';
              }

              return `  ${field.name}: ${zod}`;
            })
            .join(',\n');

          // Use Transformer import strategy to match zodImportTarget
          const zImport = new Transformer({}).generateImportZodStatement();
          const enumImportBase = placeAtRoot ? './enums' : '../enums';
          const importExtension = Transformer.getImportFileExtension();
          const enumNaming = (await import('./utils/naming-resolver')).resolveEnumNaming(config);
          const { generateFileName, generateExportName } = await import('./utils/naming-resolver');
          const enumSchemaImports = enumTypes.length
            ? enumTypes
                .map((n) => {
                  const fileName = generateFileName(
                    enumNaming.filePattern,
                    n,
                    undefined,
                    undefined,
                    n,
                  );
                  const base = fileName.replace(/\.ts$/, '');
                  const exportName = generateExportName(
                    enumNaming.exportNamePattern,
                    n,
                    undefined,
                    undefined,
                    n,
                  );
                  return exportName === `${n}Schema`
                    ? `import { ${exportName} } from '${enumImportBase}/${base}${importExtension}';`
                    : `import { ${exportName} as ${n}Schema } from '${enumImportBase}/${base}${importExtension}';`;
                })
                .join('\n') + '\n'
            : '';
          // Check if Prisma import is needed (for Decimal or other Prisma types)
          const needsPrismaImport = fieldLines.includes('Prisma.');
          const prismaImport = needsPrismaImport
            ? `import { Prisma } from '${Transformer.resolvePrismaImportPath(path.dirname(filePath))}';\n`
            : '';
          // Apply strict mode based on configuration for this variant
          const isStandardVariant = ['pure', 'input', 'result'].includes(variantDef.name);
          const strictModeSuffix = isStandardVariant
            ? strictModeResolver.getVariantStrictModeSuffix(
                model.name,
                variantDef.name as 'pure' | 'input' | 'result',
              )
            : strictModeResolver.getObjectStrictModeSuffix(model.name);

          // Get the correct type name based on naming configuration
          let typeName = `${model.name}Type`; // fallback default
          try {
            const { resolvePureModelNaming } = await import('./utils/naming-resolver');
            const namingResolved = resolvePureModelNaming(config);
            typeName = `${model.name}${namingResolved.typeSuffix}`;
          } catch {
            // fallback to default naming
            typeName = `${model.name}Type`;
          }
          const content = `${zImport}${prismaImport}${enumSchemaImports}// prettier-ignore\nexport const ${schemaName} = z.object({\n${fieldLines}\n})${strictModeSuffix};\n\nexport type ${typeName} = z.infer<typeof ${schemaName}>;\n`;
          await writeFileSafely(filePath, content);
          exportLines.push(`export { ${schemaName} } from './${fileBase}${importExtension}';`);
        }
      }

      if (!placeAtRoot) {
        // Write a local variants index when not at root
        const variantIndexContent = [
          '/**',
          ' * Schema Variants Index',
          ' * Auto-generated - do not edit manually',
          ' */',
          '',
          ...exportLines,
          '',
        ].join('\n');
        await writeFileSafely(`${variantsOutputPath}/index.ts`, variantIndexContent);
      }

      logger.debug(
        `📦 Generated ${exportLines.length} variant schemas across ${enabledModels.length} models (${placeAtRoot ? 'top-level' : 'variants/ directory'})`,
      );
    } catch (error) {
      console.error(
        `❌ Variant generation (array) failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  } else {
    // Existing object-based variants path
    const enabledVariants = Object.entries(variants)
      .filter(([_, variantConfig]) => Boolean(variantConfig?.enabled))
      .map(([variantName]) => variantName);

    if (enabledVariants.length === 0) {
      logger.debug('📦 No variants enabled, skipping variant generation');
      return;
    }

    logger.debug(`📦 Generating variant schemas for: ${enabledVariants.join(', ')}`);

    try {
      // Object-based variants are always placed under schemas/variants
      const variantsOutputPath = path.join(Transformer.getSchemasPath(), 'variants');

      // Filter models based on configuration
      const enabledModels = models.filter((model) => Transformer.isModelEnabled(model.name));

      if (enabledModels.length === 0) {
        logger.warn('⚠️  No models enabled for variant generation');
        return;
      }

      // Create variants directory
      await fs.mkdir(variantsOutputPath, { recursive: true });

      // Generate each variant type (object-based)
      for (const variantName of enabledVariants) {
        await generateVariantType(enabledModels, variantName, variantsOutputPath, config);
      }

      // Generate variants index file (object-based)
      await generateVariantsIndex(enabledVariants, variantsOutputPath);

      logger.debug(
        `📦 Generated ${enabledVariants.length} variant types for ${enabledModels.length} models`,
      );
    } catch (error) {
      console.error(
        `❌ Variant generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Generate schemas for a specific variant type
 */
async function generateVariantType(
  models: DMMF.Model[],
  variantName: string,
  outputPath: string,
  config: CustomGeneratorConfig,
) {
  const variantPath = `${outputPath}/${variantName}`;
  await fs.mkdir(variantPath, { recursive: true });

  const variantConfig = config.variants?.[variantName as keyof typeof config.variants];
  if (!variantConfig) return;

  const exports: string[] = [];
  const strictModeResolver = createStrictModeResolver(config);

  for (const model of models) {
    const modelConfig = config.models?.[model.name];
    const modelVariantConfig =
      modelConfig?.variants?.[variantName as keyof typeof modelConfig.variants];

    // Generate schema for this model/variant combination
    const suffix =
      variantConfig.suffix?.replace(/^\./, '') ||
      variantName.charAt(0).toUpperCase() + variantName.slice(1);
    const schemaName = `${model.name}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}Schema`;
    const fileName = `${model.name}.${variantName}.ts`;
    const filePath = `${variantPath}/${fileName}`;

    // Get effective field exclusions
    const excludeFields = [
      ...(config.globalExclusions?.[variantName as keyof typeof config.globalExclusions] || []),
      ...(variantConfig.excludeFields || []),
      ...(modelVariantConfig?.excludeFields || []),
    ];

    // Generate schema content
    const currentDir = path.posix.join('variants', variantName);
    const schemaContent = await generateVariantSchemaContent(
      model,
      schemaName,
      excludeFields,
      variantName,
      config,
      strictModeResolver,
      currentDir,
      variantPath,
    );

    logger.debug(`   📝 Creating ${variantName} variant: ${fileName} (${schemaName})`);

    // Write file
    await writeFileSafely(filePath, schemaContent);

    const importExtension = Transformer.getImportFileExtension();
    exports.push(
      `export { ${schemaName} } from './${model.name}.${variantName}${importExtension}';`,
    );
  }

  // Generate variant index file
  const variantIndexContent = [
    '/**',
    ` * ${variantName.charAt(0).toUpperCase() + variantName.slice(1)} Variant Schemas`,
    ' * Auto-generated - do not edit manually',
    ' */',
    '',
    ...exports,
    '',
  ].join('\n');

  await writeFileSafely(`${variantPath}/index.ts`, variantIndexContent);
}

/**
 * Generate schema content for a specific variant
 */
async function generateVariantSchemaContent(
  model: DMMF.Model,
  schemaName: string,
  excludeFields: string[],
  variantName: string,
  config: CustomGeneratorConfig | undefined,
  strictModeResolver: StrictModeResolver,
  currentDir: string,
  targetDir: string,
): Promise<string> {
  // Extract custom imports for this model
  const { extractModelCustomImports } = await import('./parsers/zod-comments');
  const modelCustomImports = extractModelCustomImports(model);

  const enabledFields = model.fields.filter((field) => !excludeFields.includes(field.name));

  // For variant schemas, only include model-level imports if model validation will be applied
  // Field-level custom validation is handled separately in input object schemas
  const shouldIncludeModelImports = variantName !== 'input' && modelCustomImports.customSchema;
  const rawCustomImports = shouldIncludeModelImports ? (modelCustomImports.imports ?? []) : [];

  const typeOnlyImports = rawCustomImports.filter((customImport) => customImport.isTypeOnly);
  if (typeOnlyImports.length > 0) {
    logger.warn(
      `[variants] Ignoring type-only imports on ${model.name}: ${typeOnlyImports
        .map((customImport) => customImport.importStatement)
        .join(', ')}`,
    );
  }

  const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const customSchemaUsage = modelCustomImports.customSchema ?? '';
  const uniqueCustomImports = rawCustomImports
    .filter((customImport) => !customImport.isTypeOnly)
    .filter((customImport) => {
      if (!customSchemaUsage) {
        return false;
      }
      if (!customImport.importedItems || customImport.importedItems.length === 0) {
        return true;
      }
      return customImport.importedItems.some((item) =>
        item ? new RegExp(`\\b${escapeRegExp(item)}\\b`).test(customSchemaUsage) : false,
      );
    });

  // Collect enum types used in this model to generate proper imports
  const enumTypes = Array.from(
    new Set(
      enabledFields.filter((field) => field.kind === 'enum').map((field) => String(field.type)),
    ),
  );

  // Build enum import lines for variant files: import generated enum schemas
  let enumImportLines = '';
  if (enumTypes.length > 0) {
    const importExtension = Transformer.getImportFileExtension();
    try {
      const { resolveEnumNaming, generateFileName, generateExportName } = await import(
        './utils/naming-resolver'
      );
      const enumNaming = resolveEnumNaming(config);
      enumImportLines =
        enumTypes
          .map((name) => {
            const fileName = generateFileName(
              enumNaming.filePattern,
              name,
              undefined,
              undefined,
              name,
            );
            const exportName = generateExportName(
              enumNaming.exportNamePattern,
              name,
              undefined,
              undefined,
              name,
            );
            const importPath = fileName.replace(/\.ts$/, '');
            // Only use alias if the export name differs from the expected import name
            if (exportName === `${name}Schema`) {
              return `import { ${exportName} } from '../../enums/${importPath}${importExtension}';`;
            } else {
              return `import { ${exportName} as ${name}Schema } from '../../enums/${importPath}${importExtension}';`;
            }
          })
          .join('\n') + '\n';
    } catch {
      // Fallback to default naming
      enumImportLines =
        enumTypes
          .map(
            (name) =>
              `import { ${name}Schema } from '../../enums/${name}.schema${importExtension}';`,
          )
          .join('\n') + '\n';
    }
  }

  // Get enhanced models with @zod annotation processing
  const { processModelsWithZodIntegration } = await import('./helpers/zod-integration');
  const enhancedModels = processModelsWithZodIntegration([model], {
    enableZodAnnotations: true,
    generateFallbackSchemas: true,
    validateTypeCompatibility: true,
    collectDetailedErrors: true,
    zodVersion: config?.zodImportTarget || 'auto',
  });
  const enhancedModel = enhancedModels[0];

  const fieldDefinitions = enabledFields
    .map((field) => {
      // Check if we have enhanced field information with @zod annotations
      const enhancedField = enhancedModel?.enhancedFields.find(
        (ef) => ef.field.name === field.name,
      );

      if (enhancedField && enhancedField.hasZodAnnotations && enhancedField.zodSchema) {
        // Use the enhanced schema with @zod annotations
        let schema = enhancedField.zodSchema;

        // Apply variant-specific modifier adjustments - need to handle order correctly
        // Zod validations must come BEFORE .nullable()/.optional() modifiers
        if (!field.isRequired) {
          if (variantName === 'input') {
            // For input schemas: need .optional().nullable()
            // Remove any existing .optional() or .nullable() and add them at the end
            schema = schema.replace(/\.optional\(\)/g, '').replace(/\.nullable\(\)/g, '');
            schema += '.optional().nullable()';
          } else {
            // For pure/result schemas: need .nullable()
            // Remove any existing .optional() or .nullable() and add .nullable() at the end
            schema = schema.replace(/\.optional\(\)/g, '').replace(/\.nullable\(\)/g, '');
            schema += '.nullable()';
          }
        }

        return `    ${field.name}: ${schema}`;
      }

      // Fallback to basic type generation
      const isEnum = field.kind === 'enum';
      let base = isEnum ? `${field.type}Schema` : `z.${getZodTypeForField(field)}`;

      // Handle arrays - only add .array() for enums, scalar fields already handled by getZodTypeForField
      if (field.isList && isEnum) {
        base = `${base}.array()`;
      }

      // Apply consistent optional/nullable patterns based on Prisma behavior:
      // - Database stores NULL for optional fields (never undefined)
      // - Input can accept omitted fields (become NULL) or explicit NULL
      let modifiers = '';
      if (!field.isRequired) {
        if (variantName === 'input') {
          // Input schemas: allow omitting fields OR passing null explicitly
          modifiers = '.optional().nullable()';
        } else {
          // Pure/Result schemas: database returns null for optional fields, never undefined
          modifiers = '.nullable()';
        }
      }

      return `    ${field.name}: ${base}${modifiers}`;
    })
    .join(',\n');

  // Check if partial flag is enabled for this variant
  const variantConfig = config?.variants?.[variantName as keyof typeof config.variants];
  const shouldApplyPartial = variantConfig?.partial === true;
  const partialSuffix = shouldApplyPartial ? '.partial()' : '';

  // Generate custom import lines
  const customImportLines =
    uniqueCustomImports.length > 0
      ? new Transformer({}).generateCustomImportStatements(uniqueCustomImports, currentDir)
      : '';

  // Apply model-level validation if present and appropriate for this variant type
  // Model-level validation typically applies to pure/result schemas, not input schemas
  const shouldApplyModelValidation = variantName !== 'input' && modelCustomImports.customSchema;
  const modelLevelValidation = shouldApplyModelValidation
    ? `.${modelCustomImports.customSchema}`
    : '';

  const zImport = new Transformer({}).generateImportZodStatement();

  // Check if Prisma import is needed (for Decimal or other Prisma types)
  const needsPrismaImport = fieldDefinitions.includes('Prisma.');
  const prismaImport = needsPrismaImport
    ? `import { Prisma } from '${Transformer.resolvePrismaImportPath(targetDir)}';\n`
    : '';

  // Apply strict mode based on configuration
  const strictModeSuffix = strictModeResolver.getVariantStrictModeSuffix(
    model.name,
    variantName as 'pure' | 'input' | 'result',
  );

  // Get the correct type name based on variant configuration
  // Variants should have unique type names to avoid export conflicts when exported together
  // Try to resolve from naming configuration first, fallback to variant-suffixed naming
  let typeName = `${model.name}Type`; // default fallback

  try {
    // For pure variants, respect pure model naming configuration
    if (variantName === 'pure') {
      const { resolvePureModelNaming } = await import('./utils/naming-resolver');
      const namingResolved = resolvePureModelNaming(config);
      typeName = `${model.name}${namingResolved.typeSuffix}`;
    }

    // If we're using default naming (would result in conflicts), add variant suffix for uniqueness
    if (typeName === `${model.name}Type` || typeName === model.name) {
      const variantSuffix = variantName.charAt(0).toUpperCase() + variantName.slice(1); // 'pure' -> 'Pure'
      typeName = `${model.name}${variantSuffix}Type`; // e.g., 'ZodV4ExamplesPureType'
    }
  } catch {
    // If naming resolution fails, use variant-suffixed naming to avoid conflicts
    const variantSuffix = variantName.charAt(0).toUpperCase() + variantName.slice(1);
    typeName = `${model.name}${variantSuffix}Type`;
  }

  return `${zImport}${prismaImport}${customImportLines}${enumImportLines}// prettier-ignore
export const ${schemaName} = z.object({
${fieldDefinitions}
})${strictModeSuffix}${partialSuffix}${modelLevelValidation};

export type ${typeName} = z.infer<typeof ${schemaName}>;
`;
}

/**
 * Get Zod type for a Prisma field
 */
function getZodTypeForField(field: DMMF.Field): string {
  let baseType: string;

  // Check for JSON Schema compatibility mode
  let cfg: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require to avoid circular import
    const transformer = require('./transformer').default;
    cfg = transformer.getGeneratorConfig?.();
  } catch {
    /* ignore */
  }

  switch (field.type) {
    case 'String':
      baseType = 'string()';
      break;
    case 'Int':
      baseType = 'number().int()';
      break;
    case 'Float':
      baseType = 'number()';
      break;
    case 'Boolean':
      baseType = 'boolean()';
      break;
    case 'DateTime':
      if (cfg?.jsonSchemaCompatible) {
        const format = cfg.jsonSchemaOptions?.dateTimeFormat || 'isoString';
        if (format === 'isoDate') {
          baseType = 'string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Invalid ISO date")';
        } else {
          baseType =
            'string().regex(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/, "Invalid ISO datetime")';
        }
      } else {
        baseType = 'date()';
      }
      break;
    case 'Json':
      if (cfg?.jsonSchemaCompatible) {
        baseType = 'any()';
      } else {
        baseType = 'unknown()';
      }
      break;
    case 'Bytes':
      if (cfg?.jsonSchemaCompatible) {
        const format = cfg.jsonSchemaOptions?.bytesFormat || 'base64String';
        if (format === 'base64String') {
          baseType = 'string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid base64 string")';
        } else {
          baseType = 'string().regex(/^[0-9a-fA-F]*$/, "Invalid hex string")';
        }
      } else {
        baseType = 'instanceof(Uint8Array)';
      }
      break;
    case 'BigInt':
      if (cfg?.jsonSchemaCompatible) {
        const format = cfg.jsonSchemaOptions?.bigIntFormat || 'string';
        if (format === 'string') {
          baseType = 'string().regex(/^\\d+$/, "Invalid bigint string")';
        } else {
          baseType = 'number().int()'; // Note: May lose precision for very large numbers
        }
      } else {
        baseType = 'bigint()';
      }
      break;
    case 'Decimal':
      // Check decimalMode configuration
      if (cfg?.decimalMode === 'decimal') {
        // For decimal mode, use Prisma.Decimal in input types as well
        // Note: Full union with helpers is handled in object schema generation
        baseType = 'instanceof(Prisma.Decimal)';
      } else if (cfg?.decimalMode === 'string') {
        baseType = 'string()';
      } else {
        baseType = 'number()'; // Default to number for backward compatibility
      }
      break;
    default:
      // Treat non-scalar types (relations/objects) as unknown here; enums are handled by callers
      if (cfg?.jsonSchemaCompatible) {
        baseType = 'any()';
      } else {
        baseType = 'unknown()';
      }
      break;
  }

  // Handle arrays
  if (field.isList) {
    return `array(z.${baseType})`;
  }

  return baseType;
}

/**
 * Generate main variants index file
 */
async function generateVariantsIndex(variantNames: string[], outputPath: string) {
  const importExtension = Transformer.getImportFileExtension();
  const exports = variantNames.map((variant) => {
    // For ESM, we need to import from the index file in the subdirectory
    if (importExtension) {
      return `export * from './${variant}/index${importExtension}';`;
    } else {
      return `export * from './${variant}';`;
    }
  });

  const indexContent = [
    '/**',
    ' * Schema Variants Index',
    ' * Auto-generated - do not edit manually',
    ' */',
    '',
    ...exports,
    '',
  ].join('\n');

  await writeFileSafely(`${outputPath}/index.ts`, indexContent);
}

/**
 * Generate pure model schemas in models/ directory
 * These are standalone schemas without variant suffixes
 */
async function generatePureModelSchemas(
  models: DMMF.Model[],
  config: CustomGeneratorConfig,
): Promise<void> {
  // Check if pure models are enabled and configured
  if (!config.pureModels) {
    return;
  }

  logger.debug('📦 Generating pure model schemas (naming experimental)');

  try {
    // Place pure models under the schemas directory: <schemas>/models
    // This aligns with tests and ensures enum imports can use '../enums/...'
    const modelsOutputPath = path.join(Transformer.getSchemasPath(), 'models');
    const singleFileMode = isSingleFileEnabled();

    // Filter models based on configuration
    const enabledModels = models.filter((model) => Transformer.isModelEnabled(model.name));

    if (enabledModels.length === 0) {
      logger.warn('⚠️  No models enabled for pure model generation');
      return;
    }

    // Create models directory (skip if single-file mode since we aggregate)
    if (!singleFileMode) {
      await fs.mkdir(modelsOutputPath, { recursive: true });
    }

    // Import the model generator and circular dependency detector
    const { PrismaTypeMapper } = await import('./generators/model');
    const { detectCircularDependencies } = await import('./utils/circular-dependency-detector');
    const provider =
      (
        Transformer as unknown as {
          config?: { provider?: 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'mongodb' };
        }
      ).config?.provider || 'postgresql';
    const typeMapper = new PrismaTypeMapper({
      provider,
      zodImportTarget: config.zodImportTarget,
      jsonSchemaCompatible: config.jsonSchemaCompatible,
      jsonSchemaOptions: config.jsonSchemaOptions,
      decimalMode: config.decimalMode,
    });

    // Detect circular dependencies if the option is enabled
    let circularDependencyResult: ReturnType<typeof detectCircularDependencies> | null = null;
    if (config.pureModelsIncludeRelations && config.pureModelsExcludeCircularRelations) {
      circularDependencyResult = detectCircularDependencies(enabledModels);

      if (circularDependencyResult.cycles.length > 0) {
        logger.debug(
          `🔄 Detected ${circularDependencyResult.cycles.length} circular dependencies in model relations`,
        );
        logger.debug(
          'Cycles found:',
          circularDependencyResult.cycles.map((cycle) => cycle.join(' -> ')),
        );
      }
    }

    // Compute per-model field exclusions for pure models
    const getPureExclusions = (modelName: string): Set<string> => {
      const excludes = new Set<string>();
      // Global exclusions for pure variant
      (config.globalExclusions?.pure || []).forEach((f: string) => excludes.add(f));
      // Legacy fields.exclude preserved in parser
      const legacy =
        (config.models?.[modelName] as unknown as { fields?: { exclude?: string[] } } | undefined)
          ?.fields?.exclude || [];
      legacy.forEach((f: string) => excludes.add(f));
      // New variants.pure.excludeFields
      const variantPure = config.models?.[modelName]?.variants?.pure?.excludeFields || [];
      variantPure.forEach((f: string) => excludes.add(f));

      // Add circular relation exclusions if detected
      if (circularDependencyResult) {
        const circularExclusions = circularDependencyResult.excludedRelations.get(modelName);
        if (circularExclusions) {
          circularExclusions.forEach((fieldName: string) => {
            excludes.add(fieldName);
            logger.debug(`🚫 Excluding circular relation '${fieldName}' from model '${modelName}'`);
          });
        }
      }

      return excludes;
    };

    // Create filtered copies of models applying exclusions
    const filteredModels = enabledModels.map((model) => {
      const excludes = getPureExclusions(model.name);
      if (excludes.size === 0) return model;
      const filtered = {
        ...model,
        fields: model.fields.filter((f) => !excludes.has(f.name)),
      } as unknown as DMMF.Model;
      return filtered;
    });

    // Generate pure model schemas
    const schemaCollection = typeMapper.generateSchemaCollection(filteredModels);

    const { resolvePureModelNaming, applyPattern } = await import('./utils/naming-resolver');
    const namingResolved = resolvePureModelNaming(config);
    const {
      filePattern,
      schemaSuffix,
      typeSuffix,
      exportNamePattern: exportPattern,
      legacyAliases,
    } = namingResolved;

    const buildNames = (modelName: string) => {
      const fileName = applyPattern(filePattern, modelName, schemaSuffix, typeSuffix);
      const schemaExport = applyPattern(exportPattern, modelName, schemaSuffix, typeSuffix);
      return { fileName, schemaExport };
    };

    for (const [modelName, schemaData] of schemaCollection.schemas) {
      try {
        if (!schemaData.fileContent?.content) {
          console.error(`   ❌ No content available for ${modelName}`);
          continue;
        }
        const { fileName, schemaExport } = buildNames(modelName);
        const filePath = `${modelsOutputPath}/${fileName}`;
        let content = schemaData.fileContent.content;
        logger.debug(`[pure-models] Preparing ${modelName} -> file ${fileName}`);
        // Import paths are generated correctly by the model generator; no enum path rewrite needed
        // Remove accidental duplicate enum imports (defensive clean-up)
        {
          const importExtension = Transformer.getImportFileExtension();
          const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escExt = escapeRegExp(importExtension);
          const dupSchemasEnums = new RegExp(
            `^(import { (\\w+)Schema } from '\\\\.\\\\.\\\/schemas\\\/enums\\\/\\2\\.schema${escExt}';)\\n\\1`,
            'gm',
          );
          content = content.replace(dupSchemasEnums, '$1');
          const dupEnums = new RegExp(
            `^(import { (\\w+)Schema } from '\\\\.\\\\.\\\/enums\\\/\\2\\.schema${escExt}';)\\n\\1`,
            'gm',
          );
          content = content.replace(dupEnums, '$1');
        }
        // Rename exported const & type if suffix customization used
        if (
          schemaSuffix !== 'Schema' ||
          typeSuffix !== 'Type' ||
          filePattern !== '{Model}.schema.ts'
        ) {
          // Replace default export const ModelSchema with new name
          const defaultConstRegex = new RegExp(`export const ${modelName}Schema`, 'g');
          content = content.replace(defaultConstRegex, `export const ${schemaExport}`);
          // Replace inferred type export line
          // Compute desired type name from suffix, then guard collisions with enum names
          const enumNames: string[] = (() => {
            try {
              return Transformer.enumNames || [];
            } catch {
              return [];
            }
          })();
          const desiredTypeName = `${modelName}${typeSuffix}`;
          const finalTypeName = enumNames.includes(desiredTypeName)
            ? `${modelName}Type`
            : desiredTypeName;
          // Match the pattern that the model generator actually produced
          // After const replacement, need to match against the OLD schema reference (ModelSchema)
          // This pattern matches both 'PostType' and 'Post' depending on typeSuffix configuration
          const defaultTypeRegex = new RegExp(
            `export type (${modelName}(?:Type)?) = z\\.infer<typeof ${modelName}Schema>;`,
            'g',
          );

          // Only replace if the old pattern is found (avoid double-processing)
          const originalContent = content;
          content = content.replace(
            defaultTypeRegex,
            `export type ${finalTypeName} = z.infer<typeof ${schemaExport}>;`,
          );
          // If no replacement happened, it means the content was already correct
          if (content === originalContent) {
            // Content is already in the correct format, no changes needed
          }
          // If legacy alias requested, add it after primary export
          if (legacyAliases) {
            content += `\n// Legacy aliases\nexport const ${modelName}Schema = ${schemaExport};\nexport type ${modelName}Type = z.infer<typeof ${schemaExport}>;`;
          }
        } else if (legacyAliases) {
          content += `\n// Legacy aliases\nexport const ${modelName}Model = ${modelName}Schema;`;
        }
        if (singleFileMode) {
          await writeFileSafely(filePath, content, false);
        } else {
          await fs.writeFile(filePath, content);
        }
        logger.debug(`[pure-models] Wrote ${filePath}`);
        if (legacyAliases && !/Legacy aliases/.test(content)) {
          // Fallback ensure alias block exists
          const aliasBase = schemaSuffix === '' ? `${modelName}` : `${modelName}Schema`;
          await fs.appendFile(
            filePath,
            `\n// Legacy aliases\nexport const ${modelName}Model = ${aliasBase};`,
          );
        }
        logger.debug(`   📝 Created pure model schema: ${fileName}`);
      } catch (modelError) {
        console.error(
          `   ❌ Error processing model ${modelName}: ${modelError instanceof Error ? modelError.message : 'Unknown error'}`,
        );
      }
    }

    if (!singleFileMode) {
      const modelsIndexContent = [
        '/**',
        ' * Pure Model Schemas',
        ' * Auto-generated - do not edit manually',
        ' */',
        '',
        ...Array.from(schemaCollection.schemas.keys()).map((modelName) => {
          const { fileName, schemaExport } = buildNames(modelName);
          const base = fileName.replace(/\.ts$/, '');
          const importExtension = Transformer.getImportFileExtension();
          return `export { ${schemaExport} } from './${base}${importExtension}';`;
        }),
        '',
      ].join('\n');
      const indexPath = `${modelsOutputPath}/index.ts`;
      await fs.writeFile(indexPath, modelsIndexContent);
      const { addIndexExport } = await import('./utils/writeIndexFile');
      addIndexExport(indexPath);
    }

    logger.debug(`📦 Generated pure model schemas for ${enabledModels.length} models`);
  } catch (error) {
    console.error(
      `❌ Pure model generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    // Don't throw - pure model generation failure shouldn't stop the main generation
  }
}

/**
 * Convert a parsed JSON object to a Zod schema string
 */
function convertObjectToZodSchema(obj: Record<string, any>): string {
  const entries = Object.entries(obj).map(([key, value]) => {
    const zodType = inferZodTypeFromValue(value);
    return `${JSON.stringify(key)}: ${zodType}`;
  });

  return `{ ${entries.join(', ')} }`;
}

/**
 * Convert a parsed JSON array to a Zod schema string
 */
function convertArrayToZodSchema(arr: any[]): string {
  if (arr.length === 0) {
    return 'z.unknown()';
  }

  // For simplicity, infer the type from the first element
  // In practice, you might want to validate all elements have the same type
  const firstElementType = inferZodTypeFromValue(arr[0]);
  return firstElementType;
}

/**
 * Infer a Zod type from a JavaScript value
 */
function inferZodTypeFromValue(value: any): string {
  if (value === null) {
    return 'z.null()';
  }

  switch (typeof value) {
    case 'string':
      return 'z.string()';
    case 'number':
      return Number.isInteger(value) ? 'z.number().int()' : 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'object':
      if (Array.isArray(value)) {
        return `z.array(${convertArrayToZodSchema(value)})`;
      } else {
        return `z.object(${convertObjectToZodSchema(value)})`;
      }
    default:
      return 'z.unknown()';
  }
}

const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`; // green
const cyan = (msg: string) => `\x1b[36m${msg}\x1b[0m`; // cyan

function maybeShowSponsorMessage() {
  try {
    const cacheDir = path.join(process.cwd(), 'node_modules', '.cache', 'prisma-zod-generator');
    const counterFile = path.join(cacheDir, 'counter.json');

    if (!fsFull.existsSync(cacheDir)) {
      fsFull.mkdirSync(cacheDir, { recursive: true });
    }

    let count = 0;
    if (fsFull.existsSync(counterFile)) {
      const raw = fsFull.readFileSync(counterFile, 'utf8');
      count = JSON.parse(raw).count || 0;
    }

    count++;
    fsFull.writeFileSync(counterFile, JSON.stringify({ count }, null, 2));

    if (true) {
      console.log(`
${cyan(`🚀 prisma-zod-generator has powered ${count} runs on this project!`)}

✨ Level up with PZG Pro (14-day trial, no card needed):
   - Server actions & policy automation
   - SDK publisher, API docs, drift guard
   - Performance tooling for large teams and more!
   ${green('https://omar-dulaimi.github.io/prisma-zod-generator/pricing')}

💬 Need help or want to suggest an idea?
   ${green('https://github.com/omar-dulaimi/prisma-zod-generator/issues')}

🙌 Sponsorships literally keep the lights (and tests) running:
   My current Dell Latitude laptop needs 40+ minutes to finish the full test suite.
   Helping me upgrade means faster fixes and better tooling for everyone.
   ${green('https://github.com/sponsors/omar-dulaimi')}
`);
    }
  } catch {
    // Fail silently, we don’t want to break generator if fs fails
  }
}
