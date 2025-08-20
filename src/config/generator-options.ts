/**
 * Extended generator options for Prisma Zod Generator
 *
 * This module provides parsing and validation for both existing and new
 * generator options while maintaining backward compatibility.
 */

import { logger } from '../utils/logger';

/**
 * Extended generator configuration options
 */
export interface ExtendedGeneratorOptions {
  // New configuration options
  config?: string; // Path to external config file
  minimal?: boolean; // Enable minimal mode
  variants?: string[]; // List of enabled variants
  useMultipleFiles?: boolean; // Output multiple files (default true) or single bundle
  singleFileName?: string; // Name of the single bundle file when useMultipleFiles=false
  placeSingleFileAtRoot?: boolean; // When single file, place it at output root (default true)
  pureModelsLean?: boolean; // Lean pure models (suppress docs)
  pureModelsIncludeRelations?: boolean; // Include relation fields when generating pure models (default false)
  pureModelsExcludeCircularRelations?: boolean; // When pureModelsIncludeRelations is true, exclude circular relations (default false)
  dateTimeStrategy?: 'date' | 'coerce' | 'isoString'; // DateTime scalar strategy
  optionalFieldBehavior?: 'optional' | 'nullable' | 'nullish'; // How to handle optional fields

  // Existing options (for backward compatibility)
  isGenerateSelect?: boolean;
  isGenerateInclude?: boolean;

  // Raw options from Prisma generator config
  raw: Record<string, string>;
}

/**
 * Parse and validate generator options from Prisma config
 */
export function parseGeneratorOptions(
  generatorConfig: Record<string, string> = {},
): ExtendedGeneratorOptions {
  const options: ExtendedGeneratorOptions = {
    raw: { ...generatorConfig },
  };

  // Parse config file path
  if (generatorConfig.config) {
    options.config = parseConfigPath(generatorConfig.config);
  }

  // Parse minimal mode flag
  if (generatorConfig.minimal !== undefined) {
    options.minimal = parseBoolean(generatorConfig.minimal, 'minimal');
  }

  // Parse variants list
  if (generatorConfig.variants) {
    options.variants = parseVariantsList(generatorConfig.variants);
  }

  // Parse file output mode
  if (generatorConfig.useMultipleFiles !== undefined) {
    options.useMultipleFiles = parseBoolean(generatorConfig.useMultipleFiles, 'useMultipleFiles');
  }
  if (generatorConfig.singleFileName !== undefined) {
    options.singleFileName = generatorConfig.singleFileName;
  }
  if (generatorConfig.placeSingleFileAtRoot !== undefined) {
    options.placeSingleFileAtRoot = parseBoolean(
      generatorConfig.placeSingleFileAtRoot,
      'placeSingleFileAtRoot',
    );
  }
  if (generatorConfig.pureModelsLean !== undefined) {
    options.pureModelsLean = parseBoolean(generatorConfig.pureModelsLean, 'pureModelsLean');
  }
  if (generatorConfig.pureModelsIncludeRelations !== undefined) {
    options.pureModelsIncludeRelations = parseBoolean(
      generatorConfig.pureModelsIncludeRelations,
      'pureModelsIncludeRelations',
    );
  }
  if (generatorConfig.pureModelsExcludeCircularRelations !== undefined) {
    options.pureModelsExcludeCircularRelations = parseBoolean(
      generatorConfig.pureModelsExcludeCircularRelations,
      'pureModelsExcludeCircularRelations',
    );
  }
  if (generatorConfig.dateTimeStrategy !== undefined) {
    const v = generatorConfig.dateTimeStrategy;
    if (!['date', 'coerce', 'isoString'].includes(v)) {
      throw new GeneratorOptionError(
        'dateTimeStrategy',
        v,
        'Must be one of "date", "coerce", "isoString"',
      );
    }
    options.dateTimeStrategy = v as 'date' | 'coerce' | 'isoString';
  }
  if (generatorConfig.optionalFieldBehavior !== undefined) {
    const v = generatorConfig.optionalFieldBehavior;
    if (!['optional', 'nullable', 'nullish'].includes(v)) {
      throw new GeneratorOptionError(
        'optionalFieldBehavior',
        v,
        'Must be one of "optional", "nullable", "nullish"',
      );
    }
    options.optionalFieldBehavior = v as 'optional' | 'nullable' | 'nullish';
  }

  // Parse existing options for backward compatibility
  if (generatorConfig.isGenerateSelect !== undefined) {
    options.isGenerateSelect = parseBoolean(generatorConfig.isGenerateSelect, 'isGenerateSelect');
  }

  if (generatorConfig.isGenerateInclude !== undefined) {
    options.isGenerateInclude = parseBoolean(
      generatorConfig.isGenerateInclude,
      'isGenerateInclude',
    );
  }

  return options;
}

/**
 * Parse config file path option
 */
function parseConfigPath(configValue: string): string {
  if (!configValue || typeof configValue !== 'string') {
    throw new GeneratorOptionError('config', configValue, 'Config path must be a non-empty string');
  }

  const trimmed = configValue.trim();
  if (trimmed.length === 0) {
    throw new GeneratorOptionError(
      'config',
      configValue,
      'Config path cannot be empty or whitespace only',
    );
  }

  return trimmed;
}

/**
 * Parse boolean option value
 */
function parseBoolean(value: string, optionName: string): boolean {
  if (typeof value !== 'string') {
    throw new GeneratorOptionError(
      optionName,
      value,
      `${optionName} must be a string ("true" or "false")`,
    );
  }

  const lowercased = value.toLowerCase().trim();

  if (lowercased === 'true') {
    return true;
  } else if (lowercased === 'false') {
    return false;
  } else {
    throw new GeneratorOptionError(
      optionName,
      value,
      `${optionName} must be "true" or "false", got "${value}"`,
    );
  }
}

/**
 * Parse variants list option
 */
function parseVariantsList(variantsValue: string): string[] {
  if (!variantsValue || typeof variantsValue !== 'string') {
    throw new GeneratorOptionError(
      'variants',
      variantsValue,
      'Variants must be a comma-separated string',
    );
  }

  const variants = variantsValue
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  if (variants.length === 0) {
    throw new GeneratorOptionError('variants', variantsValue, 'Variants list cannot be empty');
  }

  // Validate each variant
  const validVariants = ['pure', 'input', 'result'];
  const invalidVariants = variants.filter((v) => !validVariants.includes(v));

  if (invalidVariants.length > 0) {
    throw new GeneratorOptionError(
      'variants',
      variantsValue,
      `Invalid variants: ${invalidVariants.join(', ')}. Valid variants are: ${validVariants.join(', ')}`,
    );
  }

  // Remove duplicates
  return Array.from(new Set(variants));
}

/**
 * Validate generator options compatibility
 */
export function validateGeneratorOptions(options: ExtendedGeneratorOptions): void {
  // Check for conflicting options
  if (options.minimal && options.variants) {
    // In minimal mode, only certain variants make sense
    const minimalCompatibleVariants = ['pure', 'input'];
    const incompatibleVariants = options.variants.filter(
      (v) => !minimalCompatibleVariants.includes(v),
    );

    if (incompatibleVariants.length > 0) {
      const msg = `[prisma-zod-generator] ⚠️  In minimal mode, variants ${incompatibleVariants.join(', ')} may not be useful. Consider using only: ${minimalCompatibleVariants.join(', ')}`;
      logger.debug(msg);
    }
  }

  // Validate config path if provided
  if (options.config) {
    validateConfigPath(options.config);
  }
}

/**
 * Validate config file path
 */
function validateConfigPath(configPath: string): void {
  // Basic path validation
  if (configPath.includes('..') && !configPath.startsWith('./')) {
    const msg = `[prisma-zod-generator] ⚠️  Config path "${configPath}" contains ".." - ensure this is intentional and secure`;
    logger.debug(msg);
  }

  // Check for common config file extensions
  const validExtensions = ['.json', '.js', '.ts'];
  const hasValidExtension = validExtensions.some((ext) => configPath.endsWith(ext));

  if (!hasValidExtension) {
    const msg = `[prisma-zod-generator] ⚠️  Config path "${configPath}" doesn't have a recognized extension. Expected: ${validExtensions.join(', ')}`;
    logger.debug(msg);
  }
}

/**
 * Create default generator options
 */
export function createDefaultGeneratorOptions(): ExtendedGeneratorOptions {
  return {
    minimal: false,
    isGenerateSelect: false,
    isGenerateInclude: false,
    useMultipleFiles: true,
    singleFileName: 'schemas.ts',
    placeSingleFileAtRoot: true,
    raw: {},
  };
}

/**
 * Merge generator options with defaults
 */
export function mergeGeneratorOptions(
  options: Partial<ExtendedGeneratorOptions>,
  defaults: ExtendedGeneratorOptions = createDefaultGeneratorOptions(),
): ExtendedGeneratorOptions {
  return {
    config: options.config || defaults.config,
    minimal: options.minimal ?? defaults.minimal,
    variants: options.variants || defaults.variants,
    isGenerateSelect: options.isGenerateSelect ?? defaults.isGenerateSelect,
    isGenerateInclude: options.isGenerateInclude ?? defaults.isGenerateInclude,
    raw: { ...defaults.raw, ...options.raw },
  };
}

/**
 * Convert generator options to configuration overrides
 *
 * This creates a partial configuration that can be merged with
 * the loaded configuration file to implement option precedence.
 */
export function generatorOptionsToConfigOverrides(
  options: ExtendedGeneratorOptions,
): GeneratorConfigOverrides {
  const overrides: GeneratorConfigOverrides = {};

  // Apply minimal mode override
  if (options.minimal !== undefined) {
    overrides.mode = options.minimal ? 'minimal' : undefined;
    if (options.minimal) {
      // Force-disable select/include when minimal flag is set in generator options
      overrides.isGenerateSelect = false;
      overrides.isGenerateInclude = false;
    }
  }

  // Apply variants override
  if (options.variants && options.variants.length > 0) {
    overrides.variants = {};

    // Enable only specified variants
    const allVariants: Array<'pure' | 'input' | 'result'> = ['pure', 'input', 'result'];
    allVariants.forEach((variant) => {
      if (overrides.variants) {
        overrides.variants[variant] = {
          enabled: options.variants?.includes(variant) || false,
        };
      }
    });
  }

  // Apply file output mode overrides
  if (options.useMultipleFiles !== undefined) {
    overrides.useMultipleFiles = options.useMultipleFiles;
  }
  if (options.singleFileName) {
    overrides.singleFileName = options.singleFileName;
  }
  if (options.placeSingleFileAtRoot !== undefined) {
    overrides.placeSingleFileAtRoot = options.placeSingleFileAtRoot;
  }
  if (options.pureModelsLean !== undefined) {
    overrides.pureModelsLean = options.pureModelsLean;
  }
  if (options.pureModelsIncludeRelations !== undefined) {
    overrides.pureModelsIncludeRelations = options.pureModelsIncludeRelations;
  }
  if (options.pureModelsExcludeCircularRelations !== undefined) {
    overrides.pureModelsExcludeCircularRelations = options.pureModelsExcludeCircularRelations;
  }
  if (options.dateTimeStrategy) {
    overrides.dateTimeStrategy = options.dateTimeStrategy;
  }
  if (options.optionalFieldBehavior) {
    overrides.optionalFieldBehavior = options.optionalFieldBehavior;
  }

  return overrides;
}

/**
 * Generator configuration overrides from options
 */
export interface GeneratorConfigOverrides {
  mode?: 'full' | 'minimal' | 'custom';
  output?: string;
  // Back-compat flags, consumed earlier in pipeline
  isGenerateSelect?: boolean;
  isGenerateInclude?: boolean;
  useMultipleFiles?: boolean;
  singleFileName?: string;
  placeSingleFileAtRoot?: boolean;
  pureModelsLean?: boolean;
  pureModelsIncludeRelations?: boolean;
  pureModelsExcludeCircularRelations?: boolean;
  dateTimeStrategy?: 'date' | 'coerce' | 'isoString';
  optionalFieldBehavior?: 'optional' | 'nullable' | 'nullish';
  variants?: {
    pure?: { enabled?: boolean };
    input?: { enabled?: boolean };
    result?: { enabled?: boolean };
  };
}

/**
 * Generator option parsing error
 */
export class GeneratorOptionError extends Error {
  constructor(
    public readonly optionName: string,
    public readonly optionValue: unknown,
    message: string,
  ) {
    super(`Invalid generator option "${optionName}": ${message}`);
    this.name = 'GeneratorOptionError';
  }

  getUserFriendlyMessage(): string {
    let message = `Invalid generator option: ${this.optionName}\n`;
    message += `Value: ${JSON.stringify(this.optionValue)}\n`;
    message += `Error: ${this.message}\n\n`;

    // Add option-specific help
    switch (this.optionName) {
      case 'config':
        message += `Expected: Path to configuration file (e.g., "./zod-config.json")\n`;
        message += `Example:\n`;
        message += `generator zod {\n`;
        message += `  provider = "prisma-zod-generator"\n`;
        message += `  config = "./zod-generator.config.json"\n`;
        message += `}`;
        break;

      case 'minimal':
        message += `Expected: "true" or "false"\n`;
        message += `Example:\n`;
        message += `generator zod {\n`;
        message += `  provider = "prisma-zod-generator"\n`;
        message += `  minimal = "true"\n`;
        message += `}`;
        break;

      case 'variants':
        message += `Expected: Comma-separated list of variants: "pure", "input", "result"\n`;
        message += `Example:\n`;
        message += `generator zod {\n`;
        message += `  provider = "prisma-zod-generator"\n`;
        message += `  variants = "pure,input"\n`;
        message += `}`;
        break;

      default:
        message += `Check the documentation for valid values for "${this.optionName}"`;
        break;
    }

    return message;
  }
}

/**
 * Format generator options for display/debugging
 */
export function formatGeneratorOptions(options: ExtendedGeneratorOptions): string {
  const lines = ['Generator Options:'];

  if (options.config) {
    lines.push(`  config: "${options.config}"`);
  }

  if (options.minimal !== undefined) {
    lines.push(`  minimal: ${options.minimal}`);
  }

  if (options.variants) {
    lines.push(`  variants: [${options.variants.join(', ')}]`);
  }

  if (options.useMultipleFiles !== undefined) {
    lines.push(`  useMultipleFiles: ${options.useMultipleFiles}`);
  }
  if (options.singleFileName !== undefined) {
    lines.push(`  singleFileName: ${options.singleFileName}`);
  }

  if (options.isGenerateSelect !== undefined) {
    lines.push(`  isGenerateSelect: ${options.isGenerateSelect}`);
  }

  if (options.isGenerateInclude !== undefined) {
    lines.push(`  isGenerateInclude: ${options.isGenerateInclude}`);
  }

  const rawCount = Object.keys(options.raw).length;
  if (rawCount > 0) {
    lines.push(`  raw options: ${rawCount} total`);
  }

  return lines.join('\n');
}

/**
 * Check if generator options indicate legacy usage
 */
export function isLegacyUsage(options: ExtendedGeneratorOptions): boolean {
  // No new options and has legacy options or no options at all
  return (
    !options.config &&
    !options.minimal &&
    !options.variants &&
    (options.isGenerateSelect !== undefined ||
      options.isGenerateInclude !== undefined ||
      Object.keys(options.raw).length <= 2)
  ); // Only legacy options or empty
}

/**
 * Get migration suggestions for legacy usage
 */
export function getLegacyMigrationSuggestions(options: ExtendedGeneratorOptions): string[] {
  const suggestions: string[] = [];

  if (options.isGenerateSelect || options.isGenerateInclude) {
    suggestions.push(
      'Consider migrating to configuration file for better organization:\n' +
        '  1. Create zod-generator.config.json\n' +
        '  2. Move isGenerateSelect/isGenerateInclude to config file\n' +
        '  3. Add config = "./zod-generator.config.json" to generator block',
    );
  }

  return suggestions;
}

/**
 * Check if there are conflicting options between generator options and expected config file
 */
export function detectOptionConflicts(
  generatorOptions: ExtendedGeneratorOptions,
  configFileHasOptions: boolean,
): string[] {
  const conflicts: string[] = [];

  if (configFileHasOptions && generatorOptions.minimal !== undefined) {
    conflicts.push(
      'Both config file and generator "minimal" option are specified. ' +
        'Generator option will take precedence.',
    );
  }

  if (configFileHasOptions && generatorOptions.variants !== undefined) {
    conflicts.push(
      'Both config file and generator "variants" option are specified. ' +
        'Generator option will take precedence.',
    );
  }

  return conflicts;
}

/**
 * Get effective configuration summary showing which options are active and their source
 */
export function getEffectiveConfigurationSummary(
  generatorOptions: ExtendedGeneratorOptions,
  hasConfigFile: boolean,
): string {
  const lines = ['Effective Configuration:'];

  if (generatorOptions.config) {
    lines.push(`  Config file: ${generatorOptions.config} ${hasConfigFile ? '✅' : '❌'}`);
  }

  if (generatorOptions.minimal !== undefined) {
    lines.push(`  Minimal mode: ${generatorOptions.minimal} (from generator options)`);
  }

  if (generatorOptions.variants) {
    lines.push(`  Variants: [${generatorOptions.variants.join(', ')}] (from generator options)`);
  }

  if (generatorOptions.isGenerateSelect !== undefined) {
    lines.push(`  Generate Select: ${generatorOptions.isGenerateSelect} (legacy)`);
  }

  if (generatorOptions.isGenerateInclude !== undefined) {
    lines.push(`  Generate Include: ${generatorOptions.isGenerateInclude} (legacy)`);
  }

  return lines.join('\n');
}
