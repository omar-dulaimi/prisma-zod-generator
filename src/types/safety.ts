/**
 * Safety system configuration types
 */

/**
 * Safety levels provide preset configurations for different use cases
 */
export type SafetyLevel =
  | 'strict' // Block even warned paths (most restrictive)
  | 'standard' // Current behavior: warn dangerous, block project roots
  | 'permissive' // Only warn, never block generation
  | 'disabled'; // No safety checks at all

/**
 * Granular safety configuration options for advanced control
 */
export interface SafetyOptions {
  /**
   * Overall safety level preset
   * @default 'standard'
   */
  level?: SafetyLevel;

  /**
   * Master switch to enable/disable all safety features
   * @default true
   */
  enabled?: boolean;

  /**
   * Allow generation in directories with dangerous names (src, lib, components, etc.)
   * @default false (warnings shown)
   */
  allowDangerousPaths?: boolean;

  /**
   * Allow generation in project root directories (containing package.json, etc.)
   * @default false (hard block)
   */
  allowProjectRoots?: boolean;

  /**
   * Allow generation in directories containing user files
   * @default false (warnings/blocks based on count)
   */
  allowUserFiles?: boolean;

  /**
   * Skip manifest tracking and cleanup
   * @default false
   */
  skipManifest?: boolean;

  /**
   * Only show warnings, never block generation
   * @default false
   */
  warningsOnly?: boolean;

  /**
   * Custom dangerous path patterns to check (in addition to built-in ones)
   */
  customDangerousPaths?: string[];

  /**
   * Custom project file patterns to check (in addition to built-in ones)
   */
  customProjectFiles?: string[];

  /**
   * Maximum number of user files allowed before blocking (ignored if allowUserFiles is true)
   * @default 5
   */
  maxUserFiles?: number;
}

/**
 * Resolved safety configuration after applying defaults and level presets
 */
export interface ResolvedSafetyConfig {
  enabled: boolean;
  allowDangerousPaths: boolean;
  allowProjectRoots: boolean;
  allowUserFiles: boolean;
  skipManifest: boolean;
  warningsOnly: boolean;
  customDangerousPaths: string[];
  customProjectFiles: string[];
  maxUserFiles: number;
  level: SafetyLevel;
}

/**
 * Safety check result with configuration-aware decisions
 */
export interface ConfigurableSafetyResult {
  isSafe: boolean;
  warnings: string[];
  errors: string[];
  blocked: boolean;
  bypassReason?: string;
}
