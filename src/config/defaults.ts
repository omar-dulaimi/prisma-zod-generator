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
      strictCreateInputs: true,
      preserveRequiredScalarsOnCreate: true,
      inferCreateArgsFromSchemas: false,
      pureModels: false, // Default to false, can be overridden by user config
      pureModelsLean: true,
      pureModelsIncludeRelations: false,
      pureModelsExcludeCircularRelations: false,
      dateTimeStrategy: 'date',
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
        if (result.variants?.result && result.variants.result.enabled === undefined) {
          result.variants.result.enabled = false;
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
        if (result.variants) {
          Object.keys(result.variants).forEach((variantName) => {
            const variant = result.variants?.[variantName as keyof typeof result.variants];
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

    // Add default configuration for models not explicitly configured
    availableModels.forEach((modelName) => {
      const models = result.models;
      if (!models?.[modelName]) {
        if (models) {
          models[modelName] = this.getDefaultModelConfig(
            modelName,
            result.mode,
            modelFieldInfo?.[modelName],
          );
        }
      } else {
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

    // Normalize variants
    if (!result.variants) {
      result.variants = {};
    }

    const variants: Array<'pure' | 'input' | 'result'> = ['pure', 'input', 'result'];
    variants.forEach((variantName) => {
      const variantsConfig = result.variants;
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

  /**
   * Create configuration preset for common use cases
   */
  static createPreset(presetName: ConfigurationPreset): GeneratorConfig {
    switch (presetName) {
      case 'minimal':
        return this.getMinimalConfiguration();

      case 'trpc':
        return {
          mode: 'custom',
          output: './generated/zod',
          globalExclusions: {
            input: ['id', 'createdAt', 'updatedAt'],
            result: [],
            pure: ['password', 'hashedPassword'],
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
              excludeFields: [],
            },
            result: {
              enabled: true,
              suffix: '.output',
              excludeFields: [],
            },
          },
          models: {},
        };

      case 'api-validation':
        return {
          mode: 'custom',
          output: './src/schemas',
          globalExclusions: {
            input: ['id', 'createdAt', 'updatedAt'],
            result: [],
            pure: [],
          },
          variants: {
            pure: {
              enabled: false,
              suffix: '.model',
              excludeFields: [],
            },
            input: {
              enabled: true,
              suffix: '.request',
              excludeFields: [],
            },
            result: {
              enabled: true,
              suffix: '.response',
              excludeFields: [],
            },
          },
          models: {},
        };

      case 'full-featured':
        return {
          mode: 'full',
          output: './generated/zod-schemas',
          globalExclusions: {},
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
              enabled: true,
              suffix: '.result',
              excludeFields: [],
            },
          },
          models: {},
        };

      default:
        return this.getDefaultConfiguration();
    }
  }

  /**
   * Get available configuration presets
   */
  static getAvailablePresets(): ConfigurationPresetInfo[] {
    return [
      {
        name: 'minimal',
        description: 'Basic CRUD operations only, minimal file output',
        useCase: 'Simple applications that only need basic database operations',
      },
      {
        name: 'trpc',
        description: 'Optimized for tRPC usage with input/output variants',
        useCase: 'Full-stack applications using tRPC for type-safe APIs',
      },
      {
        name: 'api-validation',
        description: 'Request/response validation for REST APIs',
        useCase: 'REST API applications needing request/response validation',
      },
      {
        name: 'full-featured',
        description: 'Complete schema generation with all features enabled',
        useCase: 'Complex applications needing comprehensive schema coverage',
      },
    ];
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
 * Get minimal configuration
 */
export function getMinimalConfiguration(): GeneratorConfig {
  return DefaultConfigurationManager.getMinimalConfiguration();
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
 * Create preset configuration
 */
export function createPreset(presetName: ConfigurationPreset): GeneratorConfig {
  return DefaultConfigurationManager.createPreset(presetName);
}

/**
 * Get available presets
 */
export function getAvailablePresets(): ConfigurationPresetInfo[] {
  return DefaultConfigurationManager.getAvailablePresets();
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
