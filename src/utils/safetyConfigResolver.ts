import type { SafetyOptions, SafetyLevel, ResolvedSafetyConfig } from '../types/safety';

/**
 * Default safety configurations for each level
 */
const SAFETY_LEVEL_PRESETS: Record<SafetyLevel, Omit<ResolvedSafetyConfig, 'level'>> = {
  strict: {
    enabled: true,
    allowDangerousPaths: false,
    allowProjectRoots: false,
    allowUserFiles: false,
    skipManifest: false,
    warningsOnly: false,
    customDangerousPaths: [],
    customProjectFiles: [],
    maxUserFiles: 0, // Block any user files in strict mode
  },
  standard: {
    enabled: true,
    allowDangerousPaths: false,
    allowProjectRoots: false,
    allowUserFiles: false,
    skipManifest: false,
    warningsOnly: false,
    customDangerousPaths: [],
    customProjectFiles: [],
    maxUserFiles: 5,
  },
  permissive: {
    enabled: true,
    allowDangerousPaths: true,
    allowProjectRoots: false,
    allowUserFiles: true,
    skipManifest: false,
    warningsOnly: true, // Only warn, never block
    customDangerousPaths: [],
    customProjectFiles: [],
    maxUserFiles: 50,
  },
  disabled: {
    enabled: false,
    allowDangerousPaths: true,
    allowProjectRoots: true,
    allowUserFiles: true,
    skipManifest: true,
    warningsOnly: true,
    customDangerousPaths: [],
    customProjectFiles: [],
    maxUserFiles: Infinity,
  },
};

/**
 * Resolve safety configuration by applying level presets and user overrides
 */
export function resolveSafetyConfig(options: SafetyOptions = {}): ResolvedSafetyConfig {
  const level: SafetyLevel = options.level || 'standard';
  const preset = SAFETY_LEVEL_PRESETS[level];

  // Start with level preset, then apply user overrides
  const resolved: ResolvedSafetyConfig = {
    ...preset,
    level,
    // Apply user overrides
    ...(options.enabled !== undefined && { enabled: options.enabled }),
    ...(options.allowDangerousPaths !== undefined && { allowDangerousPaths: options.allowDangerousPaths }),
    ...(options.allowProjectRoots !== undefined && { allowProjectRoots: options.allowProjectRoots }),
    ...(options.allowUserFiles !== undefined && { allowUserFiles: options.allowUserFiles }),
    ...(options.skipManifest !== undefined && { skipManifest: options.skipManifest }),
    ...(options.warningsOnly !== undefined && { warningsOnly: options.warningsOnly }),
    ...(options.maxUserFiles !== undefined && { maxUserFiles: options.maxUserFiles }),
    // Merge custom arrays
    customDangerousPaths: [
      ...preset.customDangerousPaths,
      ...(options.customDangerousPaths || [])
    ],
    customProjectFiles: [
      ...preset.customProjectFiles,
      ...(options.customProjectFiles || [])
    ],
  };

  // Special case: if safety is explicitly disabled, override all other settings
  if (resolved.enabled === false) {
    return {
      ...resolved,
      allowDangerousPaths: true,
      allowProjectRoots: true,
      allowUserFiles: true,
      skipManifest: true,
      warningsOnly: true,
      maxUserFiles: Infinity,
    };
  }

  return resolved;
}

/**
 * Parse safety configuration from generator options or environment
 */
export function parseSafetyConfigFromGeneratorOptions(generatorOptions: Record<string, any>): SafetyOptions {
  const safetyConfig: SafetyOptions = {};

  // Parse from generator block options (prefixed with safety)
  if (generatorOptions.safetyLevel) {
    safetyConfig.level = generatorOptions.safetyLevel as SafetyLevel;
  }

  if (generatorOptions.safetyEnabled !== undefined) {
    safetyConfig.enabled = parseBoolean(generatorOptions.safetyEnabled);
  }

  if (generatorOptions.safetyAllowDangerousPaths !== undefined) {
    safetyConfig.allowDangerousPaths = parseBoolean(generatorOptions.safetyAllowDangerousPaths);
  }

  if (generatorOptions.safetyAllowProjectRoots !== undefined) {
    safetyConfig.allowProjectRoots = parseBoolean(generatorOptions.safetyAllowProjectRoots);
  }

  if (generatorOptions.safetyAllowUserFiles !== undefined) {
    safetyConfig.allowUserFiles = parseBoolean(generatorOptions.safetyAllowUserFiles);
  }

  if (generatorOptions.safetySkipManifest !== undefined) {
    safetyConfig.skipManifest = parseBoolean(generatorOptions.safetySkipManifest);
  }

  if (generatorOptions.safetyWarningsOnly !== undefined) {
    safetyConfig.warningsOnly = parseBoolean(generatorOptions.safetyWarningsOnly);
  }

  if (generatorOptions.safetyMaxUserFiles !== undefined) {
    safetyConfig.maxUserFiles = parseInt(generatorOptions.safetyMaxUserFiles, 10);
  }

  // Parse custom paths (comma-separated strings)
  if (generatorOptions.safetyCustomDangerousPaths) {
    safetyConfig.customDangerousPaths = generatorOptions.safetyCustomDangerousPaths
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  if (generatorOptions.safetyCustomProjectFiles) {
    safetyConfig.customProjectFiles = generatorOptions.safetyCustomProjectFiles
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  return safetyConfig;
}

/**
 * Parse safety configuration from environment variables
 */
export function parseSafetyConfigFromEnvironment(): SafetyOptions {
  const safetyConfig: SafetyOptions = {};

  if (process.env.PRISMA_ZOD_SAFETY_LEVEL) {
    safetyConfig.level = process.env.PRISMA_ZOD_SAFETY_LEVEL as SafetyLevel;
  }

  if (process.env.PRISMA_ZOD_SAFETY_ENABLED !== undefined) {
    safetyConfig.enabled = parseBoolean(process.env.PRISMA_ZOD_SAFETY_ENABLED);
  }

  if (process.env.PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS !== undefined) {
    safetyConfig.allowDangerousPaths = parseBoolean(process.env.PRISMA_ZOD_SAFETY_ALLOW_DANGEROUS_PATHS);
  }

  if (process.env.PRISMA_ZOD_SAFETY_ALLOW_PROJECT_ROOTS !== undefined) {
    safetyConfig.allowProjectRoots = parseBoolean(process.env.PRISMA_ZOD_SAFETY_ALLOW_PROJECT_ROOTS);
  }

  if (process.env.PRISMA_ZOD_SAFETY_ALLOW_USER_FILES !== undefined) {
    safetyConfig.allowUserFiles = parseBoolean(process.env.PRISMA_ZOD_SAFETY_ALLOW_USER_FILES);
  }

  if (process.env.PRISMA_ZOD_SAFETY_SKIP_MANIFEST !== undefined) {
    safetyConfig.skipManifest = parseBoolean(process.env.PRISMA_ZOD_SAFETY_SKIP_MANIFEST);
  }

  if (process.env.PRISMA_ZOD_SAFETY_WARNINGS_ONLY !== undefined) {
    safetyConfig.warningsOnly = parseBoolean(process.env.PRISMA_ZOD_SAFETY_WARNINGS_ONLY);
  }

  if (process.env.PRISMA_ZOD_SAFETY_MAX_USER_FILES) {
    safetyConfig.maxUserFiles = parseInt(process.env.PRISMA_ZOD_SAFETY_MAX_USER_FILES, 10);
  }

  // Parse custom paths (comma-separated)
  if (process.env.PRISMA_ZOD_SAFETY_CUSTOM_DANGEROUS_PATHS) {
    safetyConfig.customDangerousPaths = process.env.PRISMA_ZOD_SAFETY_CUSTOM_DANGEROUS_PATHS
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  if (process.env.PRISMA_ZOD_SAFETY_CUSTOM_PROJECT_FILES) {
    safetyConfig.customProjectFiles = process.env.PRISMA_ZOD_SAFETY_CUSTOM_PROJECT_FILES
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return safetyConfig;
}

/**
 * Merge multiple safety configurations with precedence (later configs override earlier ones)
 */
export function mergeSafetyConfigs(...configs: SafetyOptions[]): SafetyOptions {
  const result: SafetyOptions = {};

  for (const config of configs) {
    if (!config) continue;

    // Merge primitive values (later values override)
    if (config.level !== undefined) result.level = config.level;
    if (config.enabled !== undefined) result.enabled = config.enabled;
    if (config.allowDangerousPaths !== undefined) result.allowDangerousPaths = config.allowDangerousPaths;
    if (config.allowProjectRoots !== undefined) result.allowProjectRoots = config.allowProjectRoots;
    if (config.allowUserFiles !== undefined) result.allowUserFiles = config.allowUserFiles;
    if (config.skipManifest !== undefined) result.skipManifest = config.skipManifest;
    if (config.warningsOnly !== undefined) result.warningsOnly = config.warningsOnly;
    if (config.maxUserFiles !== undefined) result.maxUserFiles = config.maxUserFiles;

    // Merge arrays (combine all values)
    if (config.customDangerousPaths?.length) {
      result.customDangerousPaths = [
        ...(result.customDangerousPaths || []),
        ...config.customDangerousPaths
      ];
    }

    if (config.customProjectFiles?.length) {
      result.customProjectFiles = [
        ...(result.customProjectFiles || []),
        ...config.customProjectFiles
      ];
    }
  }

  return result;
}

/**
 * Get a human-readable description of the safety configuration
 */
export function describeSafetyConfig(config: ResolvedSafetyConfig): string {
  if (!config.enabled) {
    return 'Safety system is disabled - no protection against dangerous paths';
  }

  const parts: string[] = [];
  parts.push(`Safety level: ${config.level}`);

  const permissions: string[] = [];
  if (config.allowDangerousPaths) permissions.push('dangerous paths');
  if (config.allowProjectRoots) permissions.push('project roots');
  if (config.allowUserFiles) permissions.push('user files');

  if (permissions.length > 0) {
    parts.push(`Allows: ${permissions.join(', ')}`);
  }

  if (config.warningsOnly) {
    parts.push('Warnings only (no blocking)');
  }

  if (config.skipManifest) {
    parts.push('Manifest tracking disabled');
  }

  if (config.maxUserFiles < Infinity) {
    parts.push(`Max user files: ${config.maxUserFiles}`);
  }

  return parts.join(' | ');
}

/**
 * Utility function to parse boolean values from strings
 */
function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }
  return false;
}

/**
 * Validate safety configuration and return any errors
 */
export function validateSafetyConfig(config: SafetyOptions): string[] {
  const errors: string[] = [];

  // Validate safety level
  if (config.level && !['strict', 'standard', 'permissive', 'disabled'].includes(config.level)) {
    errors.push(`Invalid safety level: ${config.level}. Must be one of: strict, standard, permissive, disabled`);
  }

  // Validate maxUserFiles
  if (config.maxUserFiles !== undefined && (config.maxUserFiles < 0 || !Number.isInteger(config.maxUserFiles))) {
    errors.push(`maxUserFiles must be a non-negative integer, got: ${config.maxUserFiles}`);
  }

  // Check for conflicting options
  if (config.enabled === false && config.warningsOnly === false) {
    errors.push('Cannot have warningsOnly=false when safety is disabled');
  }

  return errors;
}