/**
 * Variant Naming Convention System
 * Provides utilities for generating consistent file names and schema names for different variants
 */

import { VariantType, NamingConfig, DEFAULT_NAMING_CONFIGS } from '../types/variants';

/**
 * Global naming configuration options
 */
export interface GlobalNamingOptions {
  useModelPrefix?: boolean;
  usePascalCase?: boolean;
  customSeparator?: string;
  baseDirectory?: string;
}

/**
 * Name collision resolution strategies
 */
export enum CollisionStrategy {
  SUFFIX_INCREMENT = 'suffix_increment', // Add _1, _2, etc.
  PREFIX_VARIANT = 'prefix_variant', // Add variant prefix
  THROW_ERROR = 'throw_error', // Throw error on collision
}

/**
 * Naming collision resolution configuration
 */
export interface CollisionResolutionConfig {
  strategy: CollisionStrategy;
  maxAttempts?: number;
  customPrefix?: string;
  customSuffix?: string;
}

/**
 * Generated naming result
 */
export interface NamingResult {
  // File system names
  fileName: string;
  filePath: string;
  directoryPath: string;

  // Schema names
  schemaName: string;
  typeName: string;

  // Export names
  schemaExportName: string;
  typeExportName: string;

  // Metadata
  variantType: VariantType;
  modelName: string;
  isCollisionResolved: boolean;
  originalNames?: {
    fileName: string;
    schemaName: string;
    typeName: string;
  };
}

/**
 * Name validation result
 */
export interface NameValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Utility class for variant naming conventions
 */
export class VariantNamingSystem {
  private globalOptions: GlobalNamingOptions;
  private collisionConfig: CollisionResolutionConfig;
  private usedFileNames: Set<string> = new Set();
  private usedSchemaNames: Set<string> = new Set();

  constructor(
    globalOptions: GlobalNamingOptions = {},
    collisionConfig: CollisionResolutionConfig = {
      strategy: CollisionStrategy.SUFFIX_INCREMENT,
      maxAttempts: 10,
    },
  ) {
    this.globalOptions = {
      useModelPrefix: true,
      usePascalCase: true,
      customSeparator: '.',
      baseDirectory: './generated/schemas',
      ...globalOptions,
    };
    this.collisionConfig = collisionConfig;
  }

  /**
   * Generate complete naming for a model variant
   */
  generateNaming(
    modelName: string,
    variantType: VariantType,
    customConfig?: Partial<NamingConfig>,
  ): NamingResult {
    const config = this.mergeNamingConfig(variantType, customConfig);
    const normalizedModelName = this.normalizeModelName(modelName);

    // Generate base names
    const baseFileName = this.generateFileName(normalizedModelName, config);
    const baseSchemaName = this.generateSchemaName(normalizedModelName, config);
    const baseTypeName = this.generateTypeName(normalizedModelName, config);

    // Resolve collisions
    const resolvedNames = this.resolveNamingCollisions({
      fileName: baseFileName,
      schemaName: baseSchemaName,
      typeName: baseTypeName,
    });

    // Build full paths
    const directoryPath = this.buildDirectoryPath(variantType);
    const filePath = this.buildFilePath(directoryPath, resolvedNames.fileName);

    // Track used names
    this.usedFileNames.add(resolvedNames.fileName);
    this.usedSchemaNames.add(resolvedNames.schemaName);

    return {
      fileName: resolvedNames.fileName,
      filePath,
      directoryPath,
      schemaName: resolvedNames.schemaName,
      typeName: resolvedNames.typeName,
      schemaExportName: resolvedNames.schemaName,
      typeExportName: resolvedNames.typeName,
      variantType,
      modelName,
      isCollisionResolved: resolvedNames.isCollisionResolved,
      originalNames: resolvedNames.isCollisionResolved
        ? {
            fileName: baseFileName,
            schemaName: baseSchemaName,
            typeName: baseTypeName,
          }
        : undefined,
    };
  }

  /**
   * Generate file name for a variant
   */
  private generateFileName(modelName: string, config: NamingConfig): string {
    const baseName = this.globalOptions.usePascalCase
      ? this.toPascalCase(modelName)
      : this.toCamelCase(modelName);

    return `${baseName}${config.suffix}`;
  }

  /**
   * Generate schema name for a variant
   */
  private generateSchemaName(modelName: string, config: NamingConfig): string {
    const baseName = this.globalOptions.usePascalCase
      ? this.toPascalCase(modelName)
      : this.toCamelCase(modelName);

    return `${baseName}${config.schemaNameSuffix}`;
  }

  /**
   * Generate type name for a variant
   */
  private generateTypeName(modelName: string, config: NamingConfig): string {
    const baseName = this.globalOptions.usePascalCase
      ? this.toPascalCase(modelName)
      : this.toCamelCase(modelName);

    return `${baseName}${config.typeNameSuffix}`;
  }

  /**
   * Build directory path for variant
   */
  private buildDirectoryPath(variantType: VariantType): string {
    const baseDir = this.globalOptions.baseDirectory || './generated/schemas';
    const separator = this.globalOptions.customSeparator || '/';

    return `${baseDir}${separator}${variantType}`;
  }

  /**
   * Build full file path
   */
  private buildFilePath(directoryPath: string, fileName: string): string {
    const separator =
      this.globalOptions.customSeparator === '.' ? '/' : this.globalOptions.customSeparator || '/';
    return `${directoryPath}${separator}${fileName}`;
  }

  /**
   * Resolve naming collisions
   */
  private resolveNamingCollisions(names: {
    fileName: string;
    schemaName: string;
    typeName: string;
  }): {
    fileName: string;
    schemaName: string;
    typeName: string;
    isCollisionResolved: boolean;
  } {
    let { fileName, schemaName, typeName } = names;
    let isCollisionResolved = false;
    let attempts = 0;

    // Check for file name collisions
    while (
      this.usedFileNames.has(fileName) &&
      attempts < (this.collisionConfig.maxAttempts || 10)
    ) {
      fileName = this.resolveFileNameCollision(names.fileName, attempts + 1);
      isCollisionResolved = true;
      attempts++;
    }

    // Check for schema name collisions
    attempts = 0;
    while (
      this.usedSchemaNames.has(schemaName) &&
      attempts < (this.collisionConfig.maxAttempts || 10)
    ) {
      schemaName = this.resolveSchemaNameCollision(names.schemaName, attempts + 1);
      isCollisionResolved = true;
      attempts++;
    }

    // Type names typically follow schema names
    if (isCollisionResolved) {
      typeName = typeName.replace(
        names.schemaName.replace('Schema', ''),
        schemaName.replace('Schema', ''),
      );
    }

    if (attempts >= (this.collisionConfig.maxAttempts || 10)) {
      if (this.collisionConfig.strategy === CollisionStrategy.THROW_ERROR) {
        throw new Error(`Unable to resolve naming collision after ${attempts} attempts`);
      }
    }

    return {
      fileName,
      schemaName,
      typeName,
      isCollisionResolved,
    };
  }

  /**
   * Resolve file name collision
   */
  private resolveFileNameCollision(originalName: string, attempt: number): string {
    const { strategy } = this.collisionConfig;

    switch (strategy) {
      case CollisionStrategy.SUFFIX_INCREMENT:
        const extension = originalName.substring(originalName.lastIndexOf('.'));
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        return `${baseName}_${attempt}${extension}`;

      case CollisionStrategy.PREFIX_VARIANT:
        const prefix = this.collisionConfig.customPrefix || 'var';
        return `${prefix}_${attempt}_${originalName}`;

      default:
        return `${originalName}_${attempt}`;
    }
  }

  /**
   * Resolve schema name collision
   */
  private resolveSchemaNameCollision(originalName: string, attempt: number): string {
    const { strategy } = this.collisionConfig;

    switch (strategy) {
      case CollisionStrategy.SUFFIX_INCREMENT:
        return `${originalName}_${attempt}`;

      case CollisionStrategy.PREFIX_VARIANT:
        const prefix = this.collisionConfig.customPrefix || 'Var';
        return `${prefix}${attempt}${originalName}`;

      default:
        return `${originalName}_${attempt}`;
    }
  }

  /**
   * Merge naming configuration with defaults
   */
  private mergeNamingConfig(
    variantType: VariantType,
    customConfig?: Partial<NamingConfig>,
  ): NamingConfig {
    const defaultConfig = DEFAULT_NAMING_CONFIGS[variantType];
    return {
      ...defaultConfig,
      ...customConfig,
    };
  }

  /**
   * Normalize model name for consistent naming
   */
  private normalizeModelName(modelName: string): string {
    // Remove special characters and ensure proper casing
    return modelName.replace(/[^a-zA-Z0-9]/g, '').replace(/^\d+/, ''); // Remove leading numbers
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '');
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascalCase = this.toPascalCase(str);
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  }

  /**
   * Validate naming conventions
   */
  validateNaming(naming: NamingResult): NameValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check file name validity
    if (!this.isValidFileName(naming.fileName)) {
      errors.push(`Invalid file name: ${naming.fileName}`);
    }

    // Check schema name validity
    if (!this.isValidSchemaName(naming.schemaName)) {
      errors.push(`Invalid schema name: ${naming.schemaName}`);
    }

    // Check type name validity
    if (!this.isValidTypeName(naming.typeName)) {
      errors.push(`Invalid type name: ${naming.typeName}`);
    }

    // Check for naming consistency
    if (
      !naming.schemaName.includes(naming.modelName) &&
      !naming.schemaName.toLowerCase().includes(naming.modelName.toLowerCase())
    ) {
      warnings.push(
        `Schema name '${naming.schemaName}' doesn't clearly reference model '${naming.modelName}'`,
      );
    }

    // Suggest improvements
    if (naming.fileName.length > 50) {
      suggestions.push('Consider shorter file names for better readability');
    }

    if (naming.isCollisionResolved) {
      suggestions.push('Review naming conventions to avoid collisions');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Check if file name is valid for file system
   */
  private isValidFileName(fileName: string): boolean {
    // Basic file system compatibility check
    const invalidChars = /[<>:"/\\|?*]/;
    return (
      !invalidChars.test(fileName) &&
      fileName.length > 0 &&
      fileName.length <= 255 &&
      fileName.endsWith('.ts')
    );
  }

  /**
   * Check if schema name follows TypeScript naming conventions
   */
  private isValidSchemaName(schemaName: string): boolean {
    // Must be valid TypeScript identifier
    const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validIdentifier.test(schemaName) && schemaName.length > 0 && /^[A-Z]/.test(schemaName); // Should start with uppercase
  }

  /**
   * Check if type name follows TypeScript naming conventions
   */
  private isValidTypeName(typeName: string): boolean {
    // Must be valid TypeScript identifier
    const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validIdentifier.test(typeName) && typeName.length > 0 && /^[A-Z]/.test(typeName); // Should start with uppercase
  }

  /**
   * Clear tracked names (useful for batch operations)
   */
  clearTrackedNames(): void {
    this.usedFileNames.clear();
    this.usedSchemaNames.clear();
  }

  /**
   * Get all tracked file names
   */
  getTrackedFileNames(): string[] {
    return Array.from(this.usedFileNames);
  }

  /**
   * Get all tracked schema names
   */
  getTrackedSchemaNames(): string[] {
    return Array.from(this.usedSchemaNames);
  }
}

/**
 * Utility functions for common naming operations
 */
export class NamingUtils {
  /**
   * Generate barrel export file name for variant type
   */
  static generateBarrelFileName(variantType: VariantType): string {
    return `${variantType}.ts`;
  }

  /**
   * Generate index file name for all variants
   */
  static generateIndexFileName(): string {
    return 'index.ts';
  }

  /**
   * Generate variant directory name
   */
  static generateVariantDirectoryName(variantType: VariantType): string {
    return variantType.toLowerCase();
  }

  /**
   * Extract model name from file name
   */
  static extractModelNameFromFileName(fileName: string, variantType: VariantType): string {
    const config = DEFAULT_NAMING_CONFIGS[variantType];
    const suffix = config.suffix;

    if (fileName.endsWith(suffix)) {
      return fileName.substring(0, fileName.length - suffix.length);
    }

    return fileName.replace(/\.ts$/, '');
  }

  /**
   * Check if two names would conflict
   */
  static wouldConflict(name1: string, name2: string): boolean {
    return name1.toLowerCase() === name2.toLowerCase();
  }

  /**
   * Generate safe identifier from string
   */
  static toSafeIdentifier(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^(\d)/, '_$1')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}

export default VariantNamingSystem;
