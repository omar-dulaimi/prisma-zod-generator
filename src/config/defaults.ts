import { GeneratorConfig, ModelConfig, VariantConfig } from './parser';
import { DEFAULT_CONFIG, GENERATION_MODES, MINIMAL_OPERATIONS, PRISMA_OPERATIONS } from './schema';

/**
 * Deep merge utility for configuration objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        (result as Record<string, unknown>)[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Default configuration factory
 */
/**
 * The built-in pure/input/result variants, or undefined for the array form of custom
 * variants, which has no such keys.
 */
function builtInVariantsOf(
  config: GeneratorConfig,
): Exclude<GeneratorConfig['variants'], unknown[]> | undefined {
  return Array.isArray(config.variants) ? undefined : config.variants;
}

export class DefaultConfigurationManager {
  /**
   * Get complete default configuration
   */
  static getDefaultConfiguration(): GeneratorConfig {
    return {
      mode: DEFAULT_CONFIG.mode,
      output: DEFAULT_CONFIG.output,
      useMultipleFiles: true,
      singleFileName: 'schemas.ts',
      validateWhereUniqueAtLeastOne: false,
      strictCreateInputs: true,
      preserveRequiredScalarsOnCreate: true,
      inferCreateArgsFromSchemas: false,
      pureModels: false, // Default to false, can be overridden by user config
      pureModelsLean: true,
      pureModelsIncludeRelations: false,
      pureModelsExcludeCircularRelations: false,
      dateTimeStrategy: 'date',
      dateTimeSplitStrategy: true,
      jsonSchemaCompatible: false,
      jsonSchemaOptions: {
        dateTimeFormat: 'isoString',
        bigIntFormat: 'string',
        bytesFormat: 'base64String',
        conversionOptions: {
          unrepresentable: 'any',
          cycles: 'throw',
          reused: 'inline',
        },
      },
      optionalFieldBehavior: 'nullish',
      naming: {
        preset: 'default',
        // Intentionally leave pureModel overrides empty so presets can supply their own
        // values without being clobbered by merged defaults. Resolver will apply
        // fallback defaults when no preset/overrides are provided.
        pureModel: {},
      },
      globalExclusions: {
        input: [],
        result: [],
        pure: [],
      },
      variants: {
        pure: {
          enabled: DEFAULT_CONFIG.variants.pure.enabled,
          suffix: DEFAULT_CONFIG.variants.pure.suffix,
          excludeFields: [],
        },
        input: {
          enabled: DEFAULT_CONFIG.variants.input.enabled,
          suffix: DEFAULT_CONFIG.variants.input.suffix,
          excludeFields: [],
        },
        result: {
          enabled: DEFAULT_CONFIG.variants.result.enabled,
          suffix: DEFAULT_CONFIG.variants.result.suffix,
          excludeFields: [],
        },
      },
      models: {},
    };
  }

  /**
   * Get default configuration for minimal mode
   */
  static getMinimalConfiguration(): GeneratorConfig {
    const baseConfig = this.getDefaultConfiguration();
    return {
      ...baseConfig,
      mode: 'minimal',
      pureModels: true, // Enable pure models by default in minimal mode
      pureModelsLean: true,
      pureModelsIncludeRelations: false,
      naming: {
        preset: 'default',
        pureModel: {},
      },
      variants: {
        pure: {
          enabled: true,
          suffix: '.model',
          excludeFields: [],
        },
        input: {
          enabled: true,
          suffix: '.input',
          excludeFields: ['id', 'createdAt', 'updatedAt'],
        },
        result: {
          enabled: false, // Not typically needed in minimal mode
          suffix: '.result',
          excludeFields: [],
        },
      },
    };
  }

  /**
   * Get default configuration for custom mode
   */
  static getCustomConfiguration(): GeneratorConfig {
    const baseConfig = this.getDefaultConfiguration();
    return {
      ...baseConfig,
      mode: 'custom',
    };
  }

  /**
   * Get default variant configuration
   */
  static getDefaultVariantConfig(
    variantType: 'pure' | 'input' | 'result',
    modelFields?: string[],
  ): VariantConfig {
    const defaults = DEFAULT_CONFIG.variants[variantType as keyof typeof DEFAULT_CONFIG.variants];

    const baseConfig: VariantConfig = {
      enabled: defaults.enabled,
      suffix: defaults.suffix,
      excludeFields: [],
    };

    // Apply variant-specific defaults
    switch (variantType) {
      case 'input':
        // Only exclude fields that actually exist in the model
        const commonInputExclusions = ['id', 'createdAt', 'updatedAt'];
        const actualExclusions = modelFields
          ? commonInputExclusions.filter((field) => modelFields.includes(field))
          : commonInputExclusions;

        return {
          ...baseConfig,
          excludeFields: actualExclusions,
        };

      case 'result':
        return {
          ...baseConfig,
          excludeFields: [], // Usually include all fields in results
        };

      case 'pure':
        return {
          ...baseConfig,
          excludeFields: [], // Pure models typically include all fields
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Get default model configuration
   */
  static getDefaultModelConfig(
    modelName: string,
    mode: string = 'full',
    modelFields?: string[],
  ): ModelConfig {
    const operations = mode === 'minimal' ? [...MINIMAL_OPERATIONS] : [...PRISMA_OPERATIONS];

    return {
      enabled: true,
      operations,
      variants: {
        pure: this.getDefaultVariantConfig('pure', modelFields),
        input: this.getDefaultVariantConfig('input', modelFields),
        result: this.getDefaultVariantConfig('result', modelFields),
      },
    };
  }

  /**
   * Merge user configuration with defaults
   */
  static mergeWithDefaults(userConfig: Partial<GeneratorConfig>): GeneratorConfig {
    // Start with appropriate default based on mode
    let defaultConfig: GeneratorConfig;

    switch (userConfig.mode) {
      case 'minimal':
        defaultConfig = this.getMinimalConfiguration();
        break;
      case 'custom':
        defaultConfig = this.getCustomConfiguration();
        break;
      case 'full':
      default:
        defaultConfig = this.getDefaultConfiguration();
        break;
    }

    // Deep merge user config with defaults
    const mergedConfig = deepMerge(
      defaultConfig as Record<string, unknown>,
      userConfig as Record<string, unknown>,
    ) as GeneratorConfig;

    // Apply mode-specific adjustments
    return this.applyModeSpecificDefaults(mergedConfig);
  }

  /**
   * Apply mode-specific default adjustments
   */
  private static applyModeSpecificDefaults(config: GeneratorConfig): GeneratorConfig {
    const result = { ...config };

    switch (config.mode) {
      case 'minimal':
        // Ensure minimal mode has appropriate defaults
        // `variants` also accepts an array of custom variants; on that form `?.result` is
        // undefined and this is a no-op.
        const minimalVariants = builtInVariantsOf(result);
        if (minimalVariants?.result && minimalVariants.result.enabled === undefined) {
          minimalVariants.result.enabled = false;
        }

        // Apply minimal operations to models that don't specify operations
        if (result.models) {
          Object.keys(result.models).forEach((modelName) => {
            const modelConfig = result.models?.[modelName];
            if (modelConfig && !modelConfig.operations) {
              modelConfig.operations = [...MINIMAL_OPERATIONS];
            }
          });
        }
        break;

      case 'full':
        // Ensure all variants are enabled by default in full mode
        // Deliberately over both forms. Iterating the array yields index keys and marks
        // each custom variant `enabled: true`; the array-variant emission path depends on
        // the defaults this step attaches, so restricting it to the object form stops
        // array variants being written under variants/ at all.
        if (result.variants) {
          const variantsConfig = result.variants as unknown as Record<
            string,
            { enabled?: boolean } | undefined
          >;
          Object.keys(variantsConfig).forEach((variantName) => {
            const variant = variantsConfig[variantName];
            if (variant && variant.enabled === undefined) {
              variant.enabled = true;
            }
          });
        }
        break;

      case 'custom':
        // Custom mode uses explicit configuration, minimal adjustments
        break;
    }

    return result;
  }

  /**
   * Fill in missing model configurations with defaults
   */
  static fillMissingModelConfigs(
    config: GeneratorConfig,
    availableModels: string[],
    modelFieldInfo?: { [modelName: string]: string[] },
  ): GeneratorConfig {
    const result = { ...config };

    if (!result.models) {
      result.models = {};
    }

    // Only add default configuration for explicitly configured models
    // Don't auto-add models that weren't specified by the user
    Object.keys(result.models).forEach((modelName) => {
      const models = result.models;
      if (models?.[modelName]) {
        // Fill in missing properties for existing model configs
        const modelConfig = models[modelName];
        const defaultModelConfig = this.getDefaultModelConfig(
          modelName,
          result.mode,
          modelFieldInfo?.[modelName],
        );

        models[modelName] = deepMerge(
          defaultModelConfig as Record<string, unknown>,
          modelConfig as Record<string, unknown>,
        ) as ModelConfig;
      }
    });

    return result;
  }

  /**
   * Validate and normalize configuration
   */
  static normalizeConfiguration(config: GeneratorConfig): GeneratorConfig {
    const result = { ...config };

    // Support legacy/minimal boolean flag by mapping to mode
    const legacy = result as GeneratorConfig & { minimal?: boolean };
    if (legacy.minimal === true && result.mode !== 'minimal') {
      result.mode = 'minimal';
    }

    // Normalize mode
    if (!result.mode || !GENERATION_MODES.includes(result.mode)) {
      result.mode = DEFAULT_CONFIG.mode;
    }

    // Normalize output path
    if (!result.output || typeof result.output !== 'string') {
      result.output = DEFAULT_CONFIG.output;
    }

    // Normalize global exclusions
    if (!result.globalExclusions) {
      result.globalExclusions = {};
    }

    const variantTypes: Array<'input' | 'result' | 'pure'> = ['input', 'result', 'pure'];
    variantTypes.forEach((variantType) => {
      const globalExclusions = result.globalExclusions;
      if (globalExclusions && !Array.isArray(globalExclusions[variantType])) {
        globalExclusions[variantType] = [];
      }
    });

    // Normalize operations in global exclusions
    if (result.globalExclusions && !Array.isArray(result.globalExclusions.operations)) {
      result.globalExclusions.operations = [];
    }

    // Normalize variants
    if (!result.variants) {
      result.variants = {};
    }

    const variants: Array<'pure' | 'input' | 'result'> = ['pure', 'input', 'result'];
    variants.forEach((variantName) => {
      // Also applied to the array form, which attaches pure/input/result defaults as
      // properties on the array. That reads as an accident but is load-bearing: the
      // array-variant emission path reads those defaults, and skipping this step leaves
      // custom variants out of variants/ and out of the barrel file.
      const variantsConfig = result.variants as unknown as
        | Record<'pure' | 'input' | 'result', VariantConfig | undefined>
        | undefined;
      if (variantsConfig && !variantsConfig[variantName]) {
        variantsConfig[variantName] = this.getDefaultVariantConfig(variantName);
      } else if (variantsConfig) {
        const variant = variantsConfig[variantName];
        if (variant) {
          const defaultVariant = this.getDefaultVariantConfig(variantName);
          variantsConfig[variantName] = deepMerge(
            defaultVariant as Record<string, unknown>,
            variant as Record<string, unknown>,
          ) as VariantConfig;
        }
      }
    });

    // Normalize models
    if (!result.models) {
      result.models = {};
    }

    // Normalize file options
    if (typeof result.useMultipleFiles !== 'boolean') {
      result.useMultipleFiles = true;
    }
    if (!result.singleFileName || typeof result.singleFileName !== 'string') {
      result.singleFileName = 'schemas.ts';
    }

    return result;
  }
}

/**
 * Configuration preset types
 */
export type ConfigurationPreset = 'minimal' | 'trpc' | 'api-validation' | 'full-featured';

/**
 * Preset information interface
 */
export interface ConfigurationPresetInfo {
  name: ConfigurationPreset;
  description: string;
  useCase: string;
}

/**
 * Convenience functions
 */

/**
 * Get default configuration
 */
export function getDefaultConfiguration(): GeneratorConfig {
  return DefaultConfigurationManager.getDefaultConfiguration();
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(userConfig: Partial<GeneratorConfig>): GeneratorConfig {
  return DefaultConfigurationManager.mergeWithDefaults(userConfig);
}

/**
 * Fill missing model configurations
 */
export function fillMissingModelConfigs(
  config: GeneratorConfig,
  availableModels: string[],
  modelFieldInfo?: { [modelName: string]: string[] },
): GeneratorConfig {
  return DefaultConfigurationManager.fillMissingModelConfigs(
    config,
    availableModels,
    modelFieldInfo,
  );
}

/**
 * Normalize configuration
 */
export function normalizeConfiguration(config: GeneratorConfig): GeneratorConfig {
  return DefaultConfigurationManager.normalizeConfiguration(config);
}

/**
 * Process and finalize configuration
 *
 * This is the main function that should be used to process configuration
 * from parsing through defaults application and normalization.
 */
export function processConfiguration(
  userConfig: Partial<GeneratorConfig>,
  availableModels?: string[],
  modelFieldInfo?: { [modelName: string]: string[] },
): GeneratorConfig {
  // 1. Merge with defaults
  let config = mergeWithDefaults(userConfig);

  // 2. Normalize the configuration
  config = normalizeConfiguration(config);

  // 3. Fill in missing model configurations if models are provided
  if (availableModels && availableModels.length > 0) {
    config = fillMissingModelConfigs(config, availableModels, modelFieldInfo);
  }

  return config;
}
