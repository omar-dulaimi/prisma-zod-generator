import { promises as fs } from 'fs';
import { isAbsolute, resolve } from 'path';
import { logger } from '../utils/logger';

/**
 * Configuration interface for the Prisma Zod Generator
 */
export interface GeneratorConfig {
  /** Generation mode: full (default), minimal, or custom */
  mode?: 'full' | 'minimal' | 'custom';

  /** Output directory for generated schemas */
  output?: string;

  /**
   * Control file output mode.
   * When true (default), generate multiple files (current behavior).
   * When false, generate a single bundled file with all schemas.
   */
  useMultipleFiles?: boolean;

  /**
   * Name of the single bundled file when useMultipleFiles is false.
   * Default: "schemas.ts"
   */
  singleFileName?: string;

  /**
   * When useMultipleFiles is false, place the single bundled file at the generator output root
   * instead of inside the schemas/ subdirectory. Default: true (root).
   */
  placeSingleFileAtRoot?: boolean;

  /** Whether to generate pure model schemas */
  pureModels?: boolean;
  /** When generating pure model schemas, emit a lean version without JSDoc/stats/comments. Default: true */
  pureModelsLean?: boolean;
  /** When pureModels are enabled, include relation fields in generated model objects. Default: false (relations omitted). */
  pureModelsIncludeRelations?: boolean;

  /** When pureModelsIncludeRelations is true, exclude relation fields that would create circular references. Default: false */
  pureModelsExcludeCircularRelations?: boolean;

  /** Strategy for DateTime scalar mapping in pure models and variants. Default: 'date' */
  dateTimeStrategy?: 'date' | 'coerce' | 'isoString';

  /** How to handle optional fields in Zod schemas. Default: 'nullish' */
  optionalFieldBehavior?: 'optional' | 'nullable' | 'nullish';

  /** Global field exclusions */
  globalExclusions?: {
    input?: string[];
    result?: string[];
    pure?: string[];
  };

  /** Variant configuration */
  variants?: {
    pure?: VariantConfig;
    input?: VariantConfig;
    result?: VariantConfig;
  };

  /** Per-model configuration */
  models?: Record<string, ModelConfig>;

  /** Legacy options for backward compatibility */
  addSelectType?: boolean;
  addIncludeType?: boolean;

  /**
   * When true (default), Create-like input schemas bypass exclusions and strictly
   * match Prisma types. When false, exclusions may apply to Create-like inputs.
   */
  strictCreateInputs?: boolean;

  /**
   * When strictCreateInputs is false, preserve required non-auto scalar fields
   * (e.g., required id without default) in Create-like inputs even if excluded.
   * Default: true.
   */
  preserveRequiredScalarsOnCreate?: boolean;

  /**
   * When true, operation Args that accept Create-like inputs should be typed
   * from the generated Zod schema (or its inferred type) instead of Prisma.*.
   * Default: false. Note: current generator primarily types object schemas; this
   * flag is reserved for Args typing alignment where applicable.
   */
  inferCreateArgsFromSchemas?: boolean;

  /**
   * When using array-based variants, place generated variant files at schemas root.
   * If false, place them under a variants/ directory with an index.ts. Default: true (root).
   */
  placeArrayVariantsAtRoot?: boolean;

  /**
   * Whether to run formatter on generated schemas. Skipping formatting improves performance.
   * Default: false (do not format schemas).
   */
  formatGeneratedSchemas?: boolean;

  /** Naming customization (experimental) */
  naming?: {
    /** Apply a preset for quick migration */
    preset?: 'default' | 'zod-prisma' | 'zod-prisma-types' | 'legacy-model-suffix';
    /** Pure model naming overrides */
    pureModel?: {
      /** File name pattern, tokens: {Model} {model} {camel} {kebab}; must end with .ts */
      filePattern?: string;
      /** Suffix appended to schema const (default Schema) */
      schemaSuffix?: string; // allow empty string
      /** Suffix appended to inferred type export (default Type) */
      typeSuffix?: string; // allow empty string
      /** Pattern for export variable name. Tokens: {Model} {SchemaSuffix} */
      exportNamePattern?: string;
      /** Emit legacy alias exports (e.g. UserModel) */
      legacyAliases?: boolean;
    };
  };

  /**
   * Explicit emission controls. When provided, these booleans override heuristic
   * behaviors (minimal mode, pure-variant-only, etc.) for the respective groups.
   * Omitting a key preserves legacy behavior for that group.
   */
  emit?: {
    /** Generate enum schemas (referenced by inputs / crud). Default true */
    enums?: boolean;
    /** Generate object/input schemas (objects/ directory). Default true unless heuristics suppress. */
    objects?: boolean;
    /** Generate CRUD operation argument schemas (findUnique, createOne, ...). Default true unless heuristics suppress. */
    crud?: boolean;
    /** Generate result schemas (results/ directory). Default legacy gating (disabled by minimal mode or variants.result.enabled === false). */
    results?: boolean;
    /** Generate pure model schemas (mirrors pureModels flag if unspecified). */
    pureModels?: boolean;
    /** Generate variant wrapper schemas (variants/ directory & index). Default true if any variant enabled. */
    variants?: boolean;
  };
}

/**
 * Variant configuration interface
 */
export interface VariantConfig {
  /** Whether this variant is enabled */
  enabled?: boolean;

  /** File suffix for this variant */
  suffix?: string;

  /** Fields to exclude from this variant */
  excludeFields?: string[];
}

/**
 * Model-specific configuration interface
 */
export interface ModelConfig {
  /** Whether this model should be generated */
  enabled?: boolean;

  /** Which operations to generate for this model */
  operations?: string[];

  /** Variant-specific configuration for this model */
  variants?: {
    pure?: VariantConfig;
    input?: VariantConfig;
    result?: VariantConfig;
  };
}

/**
 * Configuration parsing result
 */
export interface ParseResult {
  /** The parsed configuration */
  config: GeneratorConfig;

  /** Path to the configuration file that was loaded */
  configPath?: string;

  /** Whether this is using default configuration */
  isDefault: boolean;
}

/**
 * Configuration parsing error
 */
export class ConfigParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly filePath?: string,
  ) {
    super(message);
    this.name = 'ConfigParseError';
  }
}

/**
 * Discover configuration file in standard locations
 */
export async function discoverConfigFile(baseDir: string = process.cwd()): Promise<string | null> {
  const configFiles = [
    'zod-generator.config.json',
    'zod-generator.config.js',
    '.zod-generator.json',
    '.zod-generator.js',
  ];

  for (const filename of configFiles) {
    const configPath = resolve(baseDir, filename);
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      // File doesn't exist, continue searching
    }
  }

  return null;
}

/**
 * Validate that a file exists and is readable
 */
export async function validateFileExists(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new ConfigParseError(`Configuration path exists but is not a file: ${filePath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigParseError(`Configuration file not found: ${filePath}`);
    }
    throw new ConfigParseError(
      `Cannot access configuration file: ${filePath}`,
      error as Error,
      filePath,
    );
  }
}

/**
 * Read configuration file content from disk
 */
export async function readConfigFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new ConfigParseError(
      `Failed to read configuration file: ${filePath}`,
      error as Error,
      filePath,
    );
  }
}

/**
 * Parse JSON configuration content
 */
export function parseJsonConfig(content: string, filePath?: string): GeneratorConfig {
  try {
    const parsed = JSON.parse(content);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new ConfigParseError('Configuration must be a JSON object', undefined, filePath);
    }

    // Transform legacy format to new format
    const transformedConfig = transformLegacyConfig(parsed);

    return transformedConfig as GeneratorConfig;
  } catch (error) {
    if (error instanceof ConfigParseError) {
      throw error;
    }

    throw new ConfigParseError(
      `Invalid JSON in configuration file${filePath ? `: ${filePath}` : ''}`,
      error as Error,
      filePath,
    );
  }
}

/**
 * Transform legacy configuration format to new format
 */
type LegacyModelConfig = {
  fields?: { exclude?: string[] };
  variants?: { [K in 'pure' | 'input' | 'result']?: { excludeFields?: string[] } };
  [key: string]: unknown;
};

function transformLegacyConfig(config: unknown): GeneratorConfig {
  const base = (typeof config === 'object' && config !== null ? config : {}) as Record<
    string,
    unknown
  > & {
    addSelectType?: unknown;
    addIncludeType?: unknown;
    models?: Record<string, LegacyModelConfig>;
  };
  const transformed: Record<string, unknown> & { models?: Record<string, LegacyModelConfig> } = {
    ...base,
  };

  // Handle legacy Include/Select options
  if (base.addSelectType !== undefined) {
    logger.debug(`🔄 Preserving legacy addSelectType: ${String(base.addSelectType)}`);
    (transformed as GeneratorConfig).addSelectType = Boolean(base.addSelectType);
  }

  if (base.addIncludeType !== undefined) {
    logger.debug(`🔄 Preserving legacy addIncludeType: ${String(base.addIncludeType)}`);
    (transformed as GeneratorConfig).addIncludeType = Boolean(base.addIncludeType);
  }

  // Transform model-specific legacy fields.exclude to variants format
  if (transformed.models) {
    const models = transformed.models;
    Object.keys(models).forEach((modelName) => {
      const modelConfig = models[modelName];

      if (modelConfig.fields?.exclude && modelConfig.fields.exclude.length > 0) {
        logger.debug(
          `🔄 Transforming legacy fields.exclude for model ${modelName}:`,
          modelConfig.fields.exclude,
        );

        // Ensure variants object exists and work with a local, typed reference
        const variants = (modelConfig.variants ?? {}) as NonNullable<LegacyModelConfig['variants']>;
        // ensure modelConfig keeps the same reference
        modelConfig.variants = variants;

        // Apply fields.exclude to all variants
        ['pure', 'input', 'result'].forEach((variant) => {
          const vKey = variant as 'pure' | 'input' | 'result';
          if (!variants[vKey]) {
            variants[vKey] = {};
          }

          // Merge with existing excludeFields if any
          const existingExcludes = variants[vKey]?.excludeFields || [];
          const legacyExcludes = modelConfig.fields?.exclude ?? [];
          variants[vKey].excludeFields = [
            ...new Set<string>([...existingExcludes, ...legacyExcludes]),
          ];
        });

        // Preserve legacy fields.exclude so it can apply to custom array-based variants too
        // (Do not delete here; generator will honor it for all variants.)
        logger.debug(
          `✅ Transformed model ${modelName} variants (preserving fields.exclude for compatibility):`,
          modelConfig.variants,
        );
      }
    });
  }

  return transformed as unknown as GeneratorConfig;
}

/**
 * Resolve configuration file path (handle relative paths)
 */
export function resolveConfigPath(configPath: string, baseDir: string = process.cwd()): string {
  if (isAbsolute(configPath)) {
    return configPath;
  }
  return resolve(baseDir, configPath);
}

/**
 * Parse configuration from file path
 */
export async function parseConfigFromFile(
  configPath: string,
  baseDir?: string,
): Promise<ParseResult> {
  const resolvedPath = resolveConfigPath(configPath, baseDir);

  // Validate file exists
  await validateFileExists(resolvedPath);

  // Read file content
  const content = await readConfigFile(resolvedPath);

  // Parse JSON content
  const config = parseJsonConfig(content, resolvedPath);

  return {
    config,
    configPath: resolvedPath,
    isDefault: false,
  };
}

/**
 * Auto-discover and parse configuration file
 */
export async function parseConfigFromDiscovery(baseDir?: string): Promise<ParseResult> {
  const discoveredPath = await discoverConfigFile(baseDir);

  if (!discoveredPath) {
    return {
      config: {},
      isDefault: true,
    };
  }

  return parseConfigFromFile(discoveredPath, baseDir);
}

/**
 * Main configuration parser function
 *
 * @param configPath - Optional path to configuration file
 * @param baseDir - Base directory for resolving relative paths
 * @returns Parsed configuration result
 */
export async function parseConfiguration(
  configPath?: string,
  baseDir?: string,
): Promise<ParseResult> {
  try {
    if (configPath) {
      // Explicit config path provided
      return await parseConfigFromFile(configPath, baseDir);
    } else {
      // Auto-discover configuration
      return await parseConfigFromDiscovery(baseDir);
    }
  } catch (error) {
    if (error instanceof ConfigParseError) {
      throw error;
    }

    throw new ConfigParseError(
      'Unexpected error while parsing configuration',
      error as Error,
      configPath,
    );
  }
}

/**
 * Create a detailed error message for configuration parsing failures
 */
export function createConfigErrorMessage(error: ConfigParseError): string {
  let message = `Configuration Error: ${error.message}`;

  if (error.filePath) {
    message += `\n  File: ${error.filePath}`;
  }

  if (error.cause) {
    message += `\n  Cause: ${error.cause.message}`;
  }

  // Add helpful suggestions
  message += '\n\nTroubleshooting:';
  message += '\n  - Ensure the configuration file exists and is readable';
  message += '\n  - Verify the JSON syntax is valid';
  message += '\n  - Check file permissions';

  if (!error.filePath) {
    message += '\n  - Consider creating a zod-generator.config.json file';
  }

  return message;
}
