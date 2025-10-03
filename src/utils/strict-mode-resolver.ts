import type { GeneratorConfig } from '../config/parser';

/**
 * Context information for strict mode resolution
 */
export interface StrictModeContext {
  /** The model name (if applicable) */
  modelName?: string;
  /** The operation name (if applicable) */
  operation?: string;
  /** The schema type: 'operation', 'object', 'variant' */
  schemaType: 'operation' | 'object' | 'variant';
  /** The variant type (if applicable) */
  variant?: 'pure' | 'input' | 'result';
}

/**
 * Default strict mode configuration
 */
const DEFAULT_STRICT_MODE = {
  enabled: true,
  operations: true,
  objects: true,
  variants: true,
} as const;

/**
 * Utility class for resolving strict mode settings based on configuration hierarchy
 */
export class StrictModeResolver {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig) {
    this.config = config;
  }

  /**
   * Resolve whether strict mode should be applied for a given context
   */
  shouldApplyStrictMode(context: StrictModeContext): boolean {
    // Start with global defaults
    const globalConfig = this.config.strictMode || {};
    const globalEnabled = globalConfig.enabled ?? DEFAULT_STRICT_MODE.enabled;

    // If globally disabled, check if there are specific overrides
    if (!globalEnabled) {
      return this.checkForOverrides(context, false);
    }

    // Global is enabled, check for specific configurations
    return this.resolveFromHierarchy(context);
  }

  /**
   * Check for specific overrides when global strict mode is disabled
   */
  private checkForOverrides(context: StrictModeContext, defaultValue: boolean): boolean {
    const { modelName } = context;

    // Check model-level overrides
    if (modelName) {
      const modelConfig = this.config.models?.[modelName]?.strictMode;
      if (modelConfig) {
        // Model-level enabled override
        if (modelConfig.enabled === true) {
          return this.resolveModelSpecific(context, modelConfig, true);
        }
        // Model-level disabled override
        if (modelConfig.enabled === false) {
          return false;
        }

        // Check if there are specific operation-level overrides even when enabled is not set
        const result = this.resolveModelSpecific(context, modelConfig, defaultValue);
        if (result !== defaultValue) {
          return result;
        }
      }
    }

    return defaultValue;
  }

  /**
   * Resolve strict mode from the complete hierarchy
   */
  private resolveFromHierarchy(context: StrictModeContext): boolean {
    const { modelName, schemaType, variant } = context;
    const globalConfig = this.config.strictMode || {};

    // Start with global schema type setting
    let result = this.getGlobalSchemaTypeSetting(schemaType, globalConfig);

    // Apply model-level overrides if applicable
    if (modelName) {
      const modelConfig = this.config.models?.[modelName]?.strictMode;
      if (modelConfig) {
        result = this.resolveModelSpecific(context, modelConfig, result);
      }
    }

    // Apply variant-level overrides if applicable
    if (variant && modelName) {
      result = this.resolveVariantSpecific(modelName, variant, result);
    }

    return result;
  }

  /**
   * Get global setting for a specific schema type
   */
  private getGlobalSchemaTypeSetting(
    schemaType: string,
    globalConfig: NonNullable<GeneratorConfig['strictMode']>,
  ): boolean {
    switch (schemaType) {
      case 'operation':
        return globalConfig.operations ?? DEFAULT_STRICT_MODE.operations;
      case 'object':
        return globalConfig.objects ?? DEFAULT_STRICT_MODE.objects;
      case 'variant':
        return globalConfig.variants ?? DEFAULT_STRICT_MODE.variants;
      default:
        return globalConfig.enabled ?? DEFAULT_STRICT_MODE.enabled;
    }
  }

  /**
   * Resolve model-specific strict mode settings
   */
  private resolveModelSpecific(
    context: StrictModeContext,
    modelConfig: NonNullable<NonNullable<GeneratorConfig['models']>[string]['strictMode']>,
    defaultValue: boolean,
  ): boolean {
    const { operation, schemaType, variant } = context;

    // Check model-level enabled override
    if (modelConfig.enabled !== null && modelConfig.enabled !== undefined) {
      // If model explicitly disabled, return false
      if (!modelConfig.enabled) {
        return false;
      }
      // If model explicitly enabled, continue with more specific checks
    }

    // Check operation-specific settings
    if (operation && schemaType === 'operation') {
      // Check if operation is in exclude list
      if (modelConfig.exclude?.includes(operation)) {
        return false;
      }

      // Check operations setting
      if (modelConfig.operations !== null && modelConfig.operations !== undefined) {
        if (typeof modelConfig.operations === 'boolean') {
          return modelConfig.operations;
        }
        if (Array.isArray(modelConfig.operations)) {
          return modelConfig.operations.includes(operation);
        }
      }
    }

    // Check object-specific settings
    if (
      schemaType === 'object' &&
      modelConfig.objects !== null &&
      modelConfig.objects !== undefined
    ) {
      return modelConfig.objects;
    }

    // Check variant-specific settings in model config
    if (
      variant &&
      modelConfig.variants?.[variant] !== null &&
      modelConfig.variants?.[variant] !== undefined
    ) {
      const variantValue = modelConfig.variants[variant];
      return variantValue !== null && variantValue !== undefined ? variantValue : defaultValue;
    }

    return defaultValue;
  }

  /**
   * Resolve variant-specific strict mode settings
   */
  private resolveVariantSpecific(
    modelName: string,
    variant: 'pure' | 'input' | 'result',
    defaultValue: boolean,
  ): boolean {
    const variantConfig = this.config.variants?.[variant];
    const modelVariantConfig = this.config.models?.[modelName]?.variants?.[variant];

    // Check model-specific variant config first (highest priority)
    if (modelVariantConfig?.strictMode !== null && modelVariantConfig?.strictMode !== undefined) {
      return modelVariantConfig.strictMode;
    }

    // Check global variant config
    if (variantConfig?.strictMode !== null && variantConfig?.strictMode !== undefined) {
      return variantConfig.strictMode;
    }

    return defaultValue;
  }

  /**
   * Convenience method for operation schemas
   */
  shouldApplyStrictModeToOperation(modelName: string, operation: string): boolean {
    return this.shouldApplyStrictMode({
      modelName,
      operation,
      schemaType: 'operation',
    });
  }

  /**
   * Convenience method for object schemas
   */
  shouldApplyStrictModeToObject(modelName?: string): boolean {
    return this.shouldApplyStrictMode({
      modelName,
      schemaType: 'object',
    });
  }

  /**
   * Convenience method for variant schemas
   */
  shouldApplyStrictModeToVariant(modelName: string, variant: 'pure' | 'input' | 'result'): boolean {
    return this.shouldApplyStrictMode({
      modelName,
      variant,
      schemaType: 'variant',
    });
  }

  /**
   * Get the strict mode suffix to append to schema definitions
   */
  getStrictModeSuffix(context: StrictModeContext): string {
    return this.shouldApplyStrictMode(context) ? '.strict()' : '';
  }

  /**
   * Get the strict mode suffix for operation schemas
   */
  getOperationStrictModeSuffix(modelName: string, operation: string): string {
    return this.shouldApplyStrictModeToOperation(modelName, operation) ? '.strict()' : '';
  }

  /**
   * Get the strict mode suffix for object schemas
   */
  getObjectStrictModeSuffix(modelName?: string): string {
    return this.shouldApplyStrictModeToObject(modelName) ? '.strict()' : '';
  }

  /**
   * Get the strict mode suffix for variant schemas
   */
  getVariantStrictModeSuffix(modelName: string, variant: 'pure' | 'input' | 'result'): string {
    return this.shouldApplyStrictModeToVariant(modelName, variant) ? '.strict()' : '';
  }
}

/**
 * Create a strict mode resolver instance
 */
export function createStrictModeResolver(config: GeneratorConfig): StrictModeResolver {
  return new StrictModeResolver(config);
}
