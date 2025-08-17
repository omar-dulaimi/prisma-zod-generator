/**
 * Variant-Specific Configuration Handler
 * Manages per-variant configuration including field exclusions and validation rules
 */

import {
  VariantType,
  VariantConfig,
  VariantManagerConfig,
  DEFAULT_NAMING_CONFIGS,
  DEFAULT_FIELD_EXCLUSIONS,
  DEFAULT_VALIDATION_CUSTOMIZATIONS,
  DEFAULT_SCHEMA_OPTIONS,
} from '../types/variants';

/**
 * Configuration inheritance hierarchy
 */
export enum ConfigInheritanceLevel {
  DEFAULT = 'default',
  GLOBAL = 'global',
  VARIANT = 'variant',
  MODEL = 'model',
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  level: ConfigInheritanceLevel;
  appliedConfig: VariantConfig;
}

/**
 * Configuration merger interface
 */
export interface ConfigMerger {
  mergeConfigs<T>(base: T, override: Partial<T>): T;
  validateMergedConfig(config: VariantConfig): ConfigValidationResult;
}

/**
 * Configuration cache entry
 */
interface ConfigCacheEntry {
  config: VariantConfig;
  hash: string;
  timestamp: number;
  inheritanceChain: ConfigInheritanceLevel[];
}

/**
 * Variant Configuration Manager
 * Handles configuration inheritance, validation, and caching
 */
export class VariantConfigurationManager implements ConfigMerger {
  private configCache: Map<string, ConfigCacheEntry> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private globalConfig: VariantManagerConfig;

  constructor(globalConfig?: Partial<VariantManagerConfig>) {
    this.globalConfig = this.buildDefaultGlobalConfig();
    if (globalConfig) {
      this.globalConfig = this.mergeConfigs(this.globalConfig, globalConfig);
    }
  }

  /**
   * Get configuration for a specific model and variant
   */
  getVariantConfig(
    modelName: string,
    variantType: VariantType,
    overrides?: Partial<VariantConfig>,
  ): VariantConfig {
    const cacheKey = this.generateCacheKey(modelName, variantType, overrides);

    // Check cache first
    const cached = this.getCachedConfig(cacheKey);
    if (cached) {
      return cached.config;
    }

    // Build configuration hierarchy
    const config = this.buildConfigurationHierarchy(modelName, variantType, overrides);

    // Cache the result
    this.cacheConfig(cacheKey, config, this.getInheritanceChain(modelName, variantType));

    return config;
  }

  /**
   * Build configuration hierarchy from defaults to model-specific overrides
   */
  private buildConfigurationHierarchy(
    modelName: string,
    variantType: VariantType,
    overrides?: Partial<VariantConfig>,
  ): VariantConfig {
    // Start with defaults
    let config = this.getDefaultVariantConfig(variantType);

    // Apply global variant defaults
    const globalDefaults = this.globalConfig.variantDefaults[variantType];
    if (globalDefaults) {
      config = this.mergeConfigs(config, globalDefaults);
    }

    // Apply model-specific overrides
    const modelOverrides = this.globalConfig.modelOverrides[modelName];
    if (modelOverrides && modelOverrides[variantType]) {
      config = this.mergeConfigs(config, modelOverrides[variantType]);
    }

    // Apply explicit overrides
    if (overrides) {
      config = this.mergeConfigs(config, overrides);
    }

    return config;
  }

  /**
   * Get default configuration for a variant type
   */
  getDefaultVariantConfig(variantType: VariantType): VariantConfig {
    return {
      type: variantType,
      enabled: true,
      naming: DEFAULT_NAMING_CONFIGS[variantType],
      fieldExclusions: DEFAULT_FIELD_EXCLUSIONS[variantType],
      validationCustomizations: DEFAULT_VALIDATION_CUSTOMIZATIONS[variantType],
      schemaOptions: DEFAULT_SCHEMA_OPTIONS[variantType],
      priority: this.getDefaultPriority(variantType),
    };
  }

  /**
   * Merge configurations with proper deep merging
   */
  mergeConfigs<T>(base: T, override: Partial<T>): T {
    const result = { ...base };

    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        const overrideValue = override[key];
        const baseValue = result[key];

        if (overrideValue !== undefined) {
          if (this.isPlainObject(overrideValue) && this.isPlainObject(baseValue)) {
            // Deep merge objects
            result[key] = this.mergeConfigs(baseValue, overrideValue);
          } else if (Array.isArray(overrideValue) && Array.isArray(baseValue)) {
            // Merge arrays (override replaces by default, but could be configured)
            (result as Record<string, unknown>)[key] = [...baseValue, ...overrideValue];
          } else {
            // Replace primitive values
            (result as Record<string, unknown>)[key] = overrideValue;
          }
        }
      }
    }

    return result;
  }

  /**
   * Validate merged configuration
   */
  validateMergedConfig(config: VariantConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic configuration
    if (!Object.values(VariantType).includes(config.type)) {
      errors.push(`Invalid variant type: ${config.type}`);
    }

    // Validate naming configuration
    if (!config.naming.suffix || !config.naming.suffix.endsWith('.ts')) {
      errors.push('Naming suffix must end with .ts');
    }

    if (!config.naming.schemaNameSuffix) {
      errors.push('Schema name suffix is required');
    }

    // Validate field exclusions
    if (config.fieldExclusions.excludeFields) {
      const invalidFields = config.fieldExclusions.excludeFields.filter(
        (field) => typeof field !== 'string' || field.trim() === '',
      );
      if (invalidFields.length > 0) {
        errors.push(`Invalid field exclusion names: ${invalidFields.join(', ')}`);
      }
    }

    // Validate validation customizations
    if (config.validationCustomizations.fieldValidations) {
      for (const [field, validation] of Object.entries(
        config.validationCustomizations.fieldValidations,
      )) {
        if (typeof validation !== 'string' || validation.trim() === '') {
          errors.push(`Invalid validation for field '${field}': must be non-empty string`);
        }
      }
    }

    // Check for conflicting configurations
    if (
      config.fieldExclusions.excludeRelations &&
      config.schemaOptions.generateTypes &&
      config.type === VariantType.RESULT
    ) {
      warnings.push('Excluding relations in result schemas may cause type issues');
    }

    // Validate priority
    if (config.priority < 0 || config.priority > 100) {
      errors.push('Priority must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      level: ConfigInheritanceLevel.VARIANT,
      appliedConfig: config,
    };
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(updates: Partial<VariantManagerConfig>): void {
    this.globalConfig = this.mergeConfigs(this.globalConfig, updates);
    this.clearCache(); // Clear cache when global config changes
  }

  /**
   * Add model-specific override
   */
  addModelOverride(
    modelName: string,
    variantType: VariantType,
    override: Partial<VariantConfig>,
  ): void {
    if (!this.globalConfig.modelOverrides[modelName]) {
      this.globalConfig.modelOverrides[modelName] = {};
    }

    const existing = this.globalConfig.modelOverrides[modelName][variantType] || {};
    this.globalConfig.modelOverrides[modelName][variantType] = this.mergeConfigs(
      existing,
      override,
    );

    // Clear affected cache entries
    this.clearModelCache(modelName, variantType);
  }

  /**
   * Remove model-specific override
   */
  removeModelOverride(modelName: string, variantType?: VariantType): void {
    if (variantType) {
      if (this.globalConfig.modelOverrides[modelName]) {
        delete this.globalConfig.modelOverrides[modelName][variantType];
        this.clearModelCache(modelName, variantType);
      }
    } else {
      delete this.globalConfig.modelOverrides[modelName];
      this.clearModelCache(modelName);
    }
  }

  /**
   * Get effective field exclusions for a model variant
   */
  getEffectiveFieldExclusions(
    modelName: string,
    variantType: VariantType,
    fieldNames: string[],
  ): {
    excludedFields: string[];
    includedFields: string[];
    exclusionReasons: Record<string, string[]>;
  } {
    const config = this.getVariantConfig(modelName, variantType);
    const exclusions = config.fieldExclusions;
    const excludedFields: string[] = [];
    const exclusionReasons: Record<string, string[]> = {};

    fieldNames.forEach((fieldName) => {
      const reasons: string[] = [];

      // Check direct field exclusions
      if (exclusions.excludeFields?.includes(fieldName)) {
        reasons.push('explicitly excluded');
      }

      // Check auto-generated exclusions
      if (exclusions.excludeAutoGenerated && this.isAutoGeneratedField(fieldName)) {
        reasons.push('auto-generated field');
      }

      // Additional exclusion logic could be added here

      if (reasons.length > 0) {
        excludedFields.push(fieldName);
        exclusionReasons[fieldName] = reasons;
      }
    });

    return {
      excludedFields,
      includedFields: fieldNames.filter((name) => !excludedFields.includes(name)),
      exclusionReasons,
    };
  }

  /**
   * Get effective validation customizations
   */
  getEffectiveValidationCustomizations(
    modelName: string,
    variantType: VariantType,
    fieldName: string,
  ): {
    validations: string[];
    isInlineDisabled: boolean;
    customTemplate?: string;
  } {
    const config = this.getVariantConfig(modelName, variantType);
    const customizations = config.validationCustomizations;
    const validations: string[] = [];

    // Add field-specific validations
    if (customizations.fieldValidations?.[fieldName]) {
      validations.push(customizations.fieldValidations[fieldName]);
    }

    // Add additional validations
    if (customizations.additionalValidations?.[fieldName]) {
      validations.push(...customizations.additionalValidations[fieldName]);
    }

    return {
      validations,
      isInlineDisabled: customizations.disableInlineValidations || false,
      customTemplate: customizations.validationTemplates?.[fieldName],
    };
  }

  /**
   * Export configuration as JSON
   */
  exportConfiguration(): string {
    return JSON.stringify(this.globalConfig, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(configJson: string): void {
    try {
      const imported = JSON.parse(configJson) as VariantManagerConfig;
      this.globalConfig = this.mergeConfigs(this.buildDefaultGlobalConfig(), imported);
      this.clearCache();
    } catch (error) {
      throw new Error(
        `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Private helper methods
   */

  private buildDefaultGlobalConfig(): VariantManagerConfig {
    return {
      outputDirectory: './generated/schemas',
      enableVariants: true,
      variantDefaults: {
        [VariantType.PURE]: {},
        [VariantType.INPUT]: {},
        [VariantType.RESULT]: {},
      },
      modelOverrides: {},
      globalNaming: {
        useModelPrefix: true,
        usePascalCase: true,
      },
    };
  }

  private getDefaultPriority(variantType: VariantType): number {
    switch (variantType) {
      case VariantType.PURE:
        return 10;
      case VariantType.INPUT:
        return 20;
      case VariantType.RESULT:
        return 30;
      default:
        return 50;
    }
  }

  private generateCacheKey(
    modelName: string,
    variantType: VariantType,
    overrides?: Partial<VariantConfig>,
  ): string {
    const overrideHash = overrides ? this.hashObject(overrides) : '';
    return `${modelName}:${variantType}:${overrideHash}`;
  }

  private getCachedConfig(cacheKey: string): ConfigCacheEntry | null {
    const entry = this.configCache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < this.cacheTimeout) {
      return entry;
    }
    return null;
  }

  private cacheConfig(
    cacheKey: string,
    config: VariantConfig,
    inheritanceChain: ConfigInheritanceLevel[],
  ): void {
    this.configCache.set(cacheKey, {
      config,
      hash: this.hashObject(config as unknown as Record<string, unknown>),
      timestamp: Date.now(),
      inheritanceChain,
    });
  }

  private clearCache(): void {
    this.configCache.clear();
  }

  private clearModelCache(modelName: string, variantType?: VariantType): void {
    const keysToDelete = Array.from(this.configCache.keys()).filter((key) => {
      const parts = key.split(':');
      return parts[0] === modelName && (!variantType || parts[1] === variantType);
    });

    keysToDelete.forEach((key) => this.configCache.delete(key));
  }

  private getInheritanceChain(
    modelName: string,
    variantType: VariantType,
  ): ConfigInheritanceLevel[] {
    const chain = [ConfigInheritanceLevel.DEFAULT];

    if (this.globalConfig.variantDefaults[variantType]) {
      chain.push(ConfigInheritanceLevel.GLOBAL);
    }

    chain.push(ConfigInheritanceLevel.VARIANT);

    if (this.globalConfig.modelOverrides[modelName]?.[variantType]) {
      chain.push(ConfigInheritanceLevel.MODEL);
    }

    return chain;
  }

  private isPlainObject(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(value instanceof RegExp)
    );
  }

  private isAutoGeneratedField(fieldName: string): boolean {
    const autoGeneratedFields = ['id', 'createdAt', 'updatedAt', 'deletedAt'];
    return autoGeneratedFields.includes(fieldName);
  }

  private hashObject(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }
}

/**
 * Configuration utility functions
 */
export class ConfigurationUtils {
  /**
   * Compare two configurations for differences
   */
  static compareConfigs(
    config1: VariantConfig,
    config2: VariantConfig,
  ): {
    areSame: boolean;
    differences: Array<{
      path: string;
      value1: unknown;
      value2: unknown;
    }>;
  } {
    const differences: Array<{ path: string; value1: unknown; value2: unknown }> = [];
    this.deepCompare(config1, config2, '', differences);

    return {
      areSame: differences.length === 0,
      differences,
    };
  }

  /**
   * Get configuration summary
   */
  static getConfigSummary(config: VariantConfig): {
    type: VariantType;
    excludedFieldsCount: number;
    customValidationsCount: number;
    hasDocumentation: boolean;
    priority: number;
  } {
    return {
      type: config.type,
      excludedFieldsCount:
        (config.fieldExclusions.excludeFields?.length || 0) +
        (config.fieldExclusions.excludeFieldTypes?.length || 0),
      customValidationsCount:
        Object.keys(config.validationCustomizations.fieldValidations || {}).length +
        Object.keys(config.validationCustomizations.additionalValidations || {}).length,
      hasDocumentation: config.schemaOptions.includeDocumentation || false,
      priority: config.priority,
    };
  }

  /**
   * Validate configuration compatibility
   */
  static validateCompatibility(configs: VariantConfig[]): {
    isCompatible: boolean;
    conflicts: Array<{
      config1: VariantType;
      config2: VariantType;
      issue: string;
    }>;
  } {
    const conflicts: Array<{ config1: VariantType; config2: VariantType; issue: string }> = [];

    for (let i = 0; i < configs.length; i++) {
      for (let j = i + 1; j < configs.length; j++) {
        const config1 = configs[i];
        const config2 = configs[j];

        // Check for priority conflicts
        if (config1.priority === config2.priority) {
          conflicts.push({
            config1: config1.type,
            config2: config2.type,
            issue: `Same priority (${config1.priority})`,
          });
        }

        // Check for naming conflicts
        if (config1.naming.schemaNameSuffix === config2.naming.schemaNameSuffix) {
          conflicts.push({
            config1: config1.type,
            config2: config2.type,
            issue: `Same schema name suffix: ${config1.naming.schemaNameSuffix}`,
          });
        }
      }
    }

    return {
      isCompatible: conflicts.length === 0,
      conflicts,
    };
  }

  private static deepCompare(
    obj1: unknown,
    obj2: unknown,
    path: string,
    differences: Array<{ path: string; value1: unknown; value2: unknown }>,
  ): void {
    if (obj1 === obj2) return;

    if (typeof obj1 !== typeof obj2) {
      differences.push({ path, value1: obj1, value2: obj2 });
      return;
    }

    if (obj1 === null || obj2 === null) {
      differences.push({ path, value1: obj1, value2: obj2 });
      return;
    }

    if (typeof obj1 === 'object') {
      const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
      for (const key of keys) {
        const newPath = path ? `${path}.${key}` : key;
        this.deepCompare(
          (obj1 as Record<string, unknown>)?.[key],
          (obj2 as Record<string, unknown>)?.[key],
          newPath,
          differences,
        );
      }
    } else if (obj1 !== obj2) {
      differences.push({ path, value1: obj1, value2: obj2 });
    }
  }
}

export default VariantConfigurationManager;
