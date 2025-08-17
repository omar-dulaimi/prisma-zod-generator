/**
 * Variant File Generation Coordinator
 * Orchestrates creation of multiple schema files for each variant
 */

import { DMMF } from '@prisma/generator-helper';
import { promises as fs } from 'fs';
import { PrismaTypeMapper } from '../generators/model';
import {
  ModelVariantCollection,
  VariantConfig,
  VariantGenerationResult,
  VariantType,
} from '../types/variants';
import { formatFile } from '../utils/formatFile';
import { NamingResult, VariantNamingSystem } from '../utils/naming';
import { writeFileSafely } from '../utils/writeFileSafely';
import { VariantConfigurationManager } from './config';

/**
 * File generation context
 */
export interface GenerationContext {
  model: DMMF.Model;
  variant: VariantType;
  config: VariantConfig;
  naming: NamingResult;
  outputDirectory: string;
  typeMapper: PrismaTypeMapper;
}

/**
 * Generation coordination options
 */
export interface GenerationCoordinationOptions {
  enabledVariants?: VariantType[];
  outputDirectory?: string;
  preserveExisting?: boolean;
  generateIndexFiles?: boolean;
  validateDependencies?: boolean;
  parallelGeneration?: boolean;
}

/**
 * Generation progress tracking
 */
export interface GenerationProgress {
  totalModels: number;
  processedModels: number;
  totalVariants: number;
  processedVariants: number;
  currentModel: string;
  currentVariant: VariantType;
  startTime: number;
  errors: Array<{
    model: string;
    variant: VariantType;
    error: string;
    timestamp: number;
  }>;
}

/**
 * Generation statistics
 */
export interface GenerationStatistics {
  totalTime: number;
  averageModelTime: number;
  variantCounts: Record<VariantType, number>;
  errorCounts: Record<VariantType, number>;
  filesSizesKB: Record<string, number>;
  dependencyGraph: Record<string, string[]>;
}

/**
 * Variant File Generation Coordinator
 * Main class that orchestrates generation of all schema variants
 */
export class VariantFileGenerationCoordinator {
  private configManager: VariantConfigurationManager;
  private namingSystem: VariantNamingSystem;
  private typeMapper: PrismaTypeMapper;
  private progressCallbacks: Array<(progress: GenerationProgress) => void> = [];

  constructor(
    configManager?: VariantConfigurationManager,
    namingSystem?: VariantNamingSystem,
    typeMapper?: PrismaTypeMapper,
  ) {
    this.configManager = configManager || new VariantConfigurationManager();
    this.namingSystem = namingSystem || new VariantNamingSystem();
    this.typeMapper = typeMapper || new PrismaTypeMapper();
  }

  /**
   * Generate all variants for multiple models
   */
  async generateAllVariants(
    models: DMMF.Model[],
    options: GenerationCoordinationOptions = {},
  ): Promise<{
    collections: ModelVariantCollection[];
    statistics: GenerationStatistics;
    errors: string[];
  }> {
    const startTime = Date.now();
    const progress: GenerationProgress = {
      totalModels: models.length,
      processedModels: 0,
      totalVariants: this.calculateTotalVariants(models, options),
      processedVariants: 0,
      currentModel: '',
      currentVariant: VariantType.PURE,
      startTime,
      errors: [],
    };

    const collections: ModelVariantCollection[] = [];
    const allErrors: string[] = [];

    try {
      if (options.parallelGeneration) {
        // Generate models in parallel
        const promises = models.map((model) =>
          this.generateModelVariants(model, options, progress),
        );
        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            collections.push(result.value);
          } else {
            allErrors.push(`Model ${models[index].name}: ${result.reason}`);
          }
        });
      } else {
        // Generate models sequentially
        for (const model of models) {
          try {
            progress.currentModel = model.name;
            this.notifyProgress(progress);

            const collection = await this.generateModelVariants(model, options, progress);
            collections.push(collection);

            progress.processedModels++;
          } catch (error) {
            const errorMessage = `Failed to generate variants for model ${model.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            allErrors.push(errorMessage);
            progress.errors.push({
              model: model.name,
              variant: progress.currentVariant,
              error: errorMessage,
              timestamp: Date.now(),
            });
          }
        }
      }

      // Generate index files if requested
      if (options.generateIndexFiles) {
        await this.generateIndexFiles(collections, options);
      }

      // Validate dependencies if requested
      if (options.validateDependencies) {
        this.validateDependencies(collections);
      }

      const statistics = this.calculateStatistics(collections, startTime);

      return {
        collections,
        statistics,
        errors: allErrors,
      };
    } catch (error) {
      throw new Error(
        `Generation coordination failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate variants for a single model
   */
  async generateModelVariants(
    model: DMMF.Model,
    options: GenerationCoordinationOptions = {},
    progress?: GenerationProgress,
  ): Promise<ModelVariantCollection> {
    const enabledVariants = options.enabledVariants || Object.values(VariantType);
    const modelStartTime = Date.now();

    const collection: ModelVariantCollection = {
      modelName: model.name,
      variants: {
        [VariantType.PURE]: null,
        [VariantType.INPUT]: null,
        [VariantType.RESULT]: null,
      },
      dependencies: new Set(),
      crossVariantReferences: {
        [VariantType.PURE]: [],
        [VariantType.INPUT]: [],
        [VariantType.RESULT]: [],
      },
      indexFile: {
        fileName: '',
        content: '',
        exports: new Set(),
      },
      generationSummary: {
        totalVariants: enabledVariants.length,
        successfulVariants: 0,
        failedVariants: 0,
        totalErrors: 0,
        processingTime: 0,
      },
    };

    // Generate each enabled variant
    for (const variantType of enabledVariants) {
      try {
        if (progress) {
          progress.currentVariant = variantType;
          this.notifyProgress(progress);
        }

        const variantResult = await this.generateSingleVariant(model, variantType, options);
        collection.variants[variantType] = variantResult;

        // Track dependencies
        variantResult.dependencies.forEach((dep) => collection.dependencies.add(dep));

        collection.generationSummary.successfulVariants++;

        if (progress) {
          progress.processedVariants++;
        }
      } catch (error) {
        const errorMessage = `Failed to generate ${variantType} variant: ${error instanceof Error ? error.message : 'Unknown error'}`;
        collection.generationSummary.failedVariants++;
        collection.generationSummary.totalErrors++;

        if (progress) {
          progress.errors.push({
            model: model.name,
            variant: variantType,
            error: errorMessage,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Generate model index file
    collection.indexFile = this.generateModelIndexFile(collection);

    // Calculate cross-variant references
    this.calculateCrossVariantReferences(collection);

    collection.generationSummary.processingTime = Date.now() - modelStartTime;

    return collection;
  }

  /**
   * Generate a single variant for a model
   */
  async generateSingleVariant(
    model: DMMF.Model,
    variantType: VariantType,
    options: GenerationCoordinationOptions = {},
  ): Promise<VariantGenerationResult> {
    const config = this.configManager.getVariantConfig(model.name, variantType);
    const naming = this.namingSystem.generateNaming(model.name, variantType, config.naming);

    const context: GenerationContext = {
      model,
      variant: variantType,
      config,
      naming,
      outputDirectory: options.outputDirectory || './generated/schemas',
      typeMapper: this.typeMapper,
    };

    // Generate schema content using the model generator
    const schemaComposition = this.typeMapper.generateModelSchema(model);
    const fileContent = this.typeMapper.generateSchemaFileContent(schemaComposition);

    // Apply variant-specific filtering and customizations
    const filteredContent = this.applyVariantCustomizations(fileContent.content, context);
    const formattedContent = await this.formatContent(filteredContent);

    // Write file to disk
    const fullPath = `${context.outputDirectory}/${naming.filePath}`;
    await this.writeVariantFile(fullPath, formattedContent, options.preserveExisting);

    // Calculate file size (unused but kept for potential future use)
    // const fileSizeKB = Buffer.byteLength(formattedContent, 'utf8') / 1024;

    return {
      variantType,
      fileName: naming.fileName,
      filePath: fullPath,
      schemaName: naming.schemaName,
      typeName: naming.typeName,
      content: formattedContent,
      dependencies: fileContent.dependencies,
      exports: new Set([naming.schemaExportName, naming.typeExportName]),
      imports: new Set(['z']), // Basic zod import
      fieldCount: schemaComposition.fields.length,
      excludedFieldCount: this.calculateExcludedFields(model, context),
      validationCount: this.calculateValidationCount(schemaComposition),
      errors: [],
    };
  }

  /**
   * Apply variant-specific customizations to content
   */
  private applyVariantCustomizations(content: string, context: GenerationContext): string {
    let customizedContent = content;

    // Apply field exclusions
    const fieldExclusions = this.configManager.getEffectiveFieldExclusions(
      context.model.name,
      context.variant,
      context.model.fields.map((f) => f.name),
    );

    // Remove excluded fields from content
    fieldExclusions.excludedFields.forEach((fieldName) => {
      const fieldRegex = new RegExp(`^\\s*${fieldName}:.*$`, 'gm');
      customizedContent = customizedContent.replace(fieldRegex, '');
    });

    // Apply validation customizations
    context.model.fields.forEach((field) => {
      if (!fieldExclusions.excludedFields.includes(field.name)) {
        const validationCustoms = this.configManager.getEffectiveValidationCustomizations(
          context.model.name,
          context.variant,
          field.name,
        );

        if (validationCustoms.validations.length > 0) {
          const fieldPattern = new RegExp(`(${field.name}:\\s*z\\.[^,\\n}]+)`, 'g');
          customizedContent = customizedContent.replace(fieldPattern, (match) => {
            const validationChain = validationCustoms.validations.join('.');
            return `${match}.${validationChain}`;
          });
        }
      }
    });

    // Apply documentation customizations based on schema options
    if (!context.config.schemaOptions.includeDocumentation) {
      // Remove JSDoc comments
      customizedContent = customizedContent.replace(/\/\*\*[\s\S]*?\*\//g, '');
    }

    // Enum handling strategy:
    //  - For pure variant files the tests expect native enum value import from @prisma/client (e.g. import { Role } ... and z.enum(Role)).
    //  - For other variants (input/result) we continue to rewrite to generated enum schemas (RoleSchema) to stay consistent with model generator.
    const enumUsageRe = /z\.(?:enum|nativeEnum)\(([_A-Za-z][_A-Za-z0-9]*)\)/g;
    const usedEnumNames: string[] = [];

    if (context.variant === 'pure') {
      // Variant base content currently uses generated enum schemas (RoleSchema). Convert them back to native enum usage.
      // 1. Detect imports of generated enum schemas and extract enum names.
      const enumSchemaImportRe =
        /import\s*\{\s*([A-Za-z0-9_]+)Schema\s*\}\s*from\s*['"].*?\/enums\/[A-Za-z0-9_]+\.schema['"];?\n?/g;
      customizedContent = customizedContent.replace(
        enumSchemaImportRe,
        (_full, enumBase: string) => {
          if (!usedEnumNames.includes(enumBase)) usedEnumNames.push(enumBase);
          return ''; // remove the schema import
        },
      );
      // 2. Replace occurrences of EnumNameSchema with z.enum(EnumName)
      usedEnumNames.forEach((enumName) => {
        const schemaRefRe = new RegExp(`${enumName}Schema`, 'g');
        customizedContent = customizedContent.replace(schemaRefRe, `z.enum(${enumName})`);
      });
      // 3. Collect any remaining direct z.enum/nativeEnum(Enum) patterns (in case mapper changed) to include in import list
      let match: RegExpExecArray | null;
      while ((match = enumUsageRe.exec(customizedContent)) !== null) {
        const enumName = match[1];
        if (!usedEnumNames.includes(enumName)) usedEnumNames.push(enumName);
      }
      if (usedEnumNames.length > 0) {
        // Remove existing @prisma/client enum imports to avoid duplication
        customizedContent = customizedContent.replace(
          /import\s*\{[^}]*\}\s*from\s*['"]@prisma\/client['"];?\n?/g,
          '',
        );
        // Insert consolidated import after zod import
        customizedContent = customizedContent.replace(
          /(import\s*\{\s*z\s*\}\s*from\s*['"]zod['"]\s*;?)/,
          (m) => `${m}\nimport { ${usedEnumNames.join(', ')} } from '@prisma/client';`,
        );
      }
    } else {
      // Non-pure variants: replace with generated enum schemas
      customizedContent = customizedContent.replace(enumUsageRe, (_m, enumName: string) => {
        if (!usedEnumNames.includes(enumName)) usedEnumNames.push(enumName);
        return `${enumName}Schema`;
      });
      if (usedEnumNames.length > 0) {
        customizedContent = customizedContent.replace(
          /import\s*\{[^}]*\}\s*from\s*['"]@prisma\/client['"];?\n?/g,
          '',
        );
        customizedContent = customizedContent.replace(
          /(import\s*\{\s*z\s*\}\s*from\s*['"]zod['"]\s*;?)/,
          (match) => {
            const importLines = usedEnumNames
              .map((name) => `import { ${name}Schema } from '../../enums/${name}.schema';`)
              .join('\n');
            return `${match}\n${importLines}`;
          },
        );
      }
    }

    return customizedContent;
  }

  /**
   * Generate model index file
   */
  private generateModelIndexFile(collection: ModelVariantCollection): {
    fileName: string;
    content: string;
    exports: Set<string>;
  } {
    const exports = new Set<string>();
    const imports: string[] = [];

    // Collect exports from all variants
    Object.entries(collection.variants).forEach(([_variantType, result]) => {
      if (result) {
        imports.push(
          `export { ${result.schemaName}, ${result.typeName} } from './${result.fileName.replace('.ts', '')}';`,
        );
        exports.add(result.schemaName);
        exports.add(result.typeName);
      }
    });

    const content = [
      '/**',
      ` * ${collection.modelName} Schema Variants Index`,
      ` * Auto-generated file - do not edit manually`,
      ` * Generated at: ${new Date().toISOString()}`,
      ' */',
      '',
      ...imports,
      '',
    ].join('\n');

    return {
      fileName: `${collection.modelName.toLowerCase()}.ts`,
      content,
      exports,
    };
  }

  /**
   * Generate global index files for all variants
   */
  private async generateIndexFiles(
    collections: ModelVariantCollection[],
    options: GenerationCoordinationOptions,
  ): Promise<void> {
    const outputDir = options.outputDirectory || './generated/schemas';

    // Generate variant-specific index files
    for (const variantType of Object.values(VariantType)) {
      const variantExports: string[] = [];

      collections.forEach((collection) => {
        const variant = collection.variants[variantType];
        if (variant) {
          variantExports.push(
            `export { ${variant.schemaName}, ${variant.typeName} } from './${variantType}/${variant.fileName.replace('.ts', '')}';`,
          );
        }
      });

      if (variantExports.length > 0) {
        const variantIndexContent = [
          '/**',
          ` * ${variantType.toUpperCase()} Variant Schemas Index`,
          ` * Auto-generated file - do not edit manually`,
          ` * Generated at: ${new Date().toISOString()}`,
          ' */',
          '',
          ...variantExports,
          '',
        ].join('\n');

        const variantIndexPath = `${outputDir}/${variantType}.ts`;
        await this.writeVariantFile(variantIndexPath, variantIndexContent);
      }
    }

    // Generate main index file
    const mainIndexContent = [
      '/**',
      ' * All Schema Variants Index',
      ' * Auto-generated file - do not edit manually',
      ` * Generated at: ${new Date().toISOString()}`,
      ' */',
      '',
      ...Object.values(VariantType).map((variant) => `export * from './${variant}';`),
      '',
    ].join('\n');

    const mainIndexPath = `${outputDir}/index.ts`;
    await this.writeVariantFile(mainIndexPath, mainIndexContent);
  }

  /**
   * Calculate cross-variant references
   */
  private calculateCrossVariantReferences(collection: ModelVariantCollection): void {
    // This would analyze which variants reference each other
    // For now, implement basic logic
    Object.keys(collection.variants).forEach((variantType) => {
      const variant = variantType as VariantType;
      collection.crossVariantReferences[variant] = [];

      // Pure variants might be referenced by input/result variants
      if (variant === VariantType.PURE) {
        if (collection.variants[VariantType.INPUT]) {
          collection.crossVariantReferences[variant].push(VariantType.INPUT);
        }
        if (collection.variants[VariantType.RESULT]) {
          collection.crossVariantReferences[variant].push(VariantType.RESULT);
        }
      }
    });
  }

  /**
   * Helper methods
   */

  private calculateTotalVariants(
    models: DMMF.Model[],
    options: GenerationCoordinationOptions,
  ): number {
    const enabledVariants = options.enabledVariants || Object.values(VariantType);
    return models.length * enabledVariants.length;
  }

  private calculateExcludedFields(model: DMMF.Model, context: GenerationContext): number {
    const exclusions = this.configManager.getEffectiveFieldExclusions(
      context.model.name,
      context.variant,
      model.fields.map((f) => f.name),
    );
    return exclusions.excludedFields.length;
  }

  private calculateValidationCount(composition: {
    statistics?: { enhancedFields?: number };
  }): number {
    return composition.statistics?.enhancedFields || 0;
  }

  private async formatContent(content: string): Promise<string> {
    try {
      return await formatFile(content);
    } catch {
      // Return unformatted content if formatting fails
      return content;
    }
  }

  private async writeVariantFile(
    filePath: string,
    content: string,
    preserveExisting?: boolean,
  ): Promise<void> {
    if (preserveExisting) {
      // Check if file exists and skip if it does
      try {
        await fs.access(filePath);
        return; // File exists, skip writing
      } catch {
        // File doesn't exist, proceed with writing
      }
    }

    await writeFileSafely(filePath, content);
  }

  private validateDependencies(collections: ModelVariantCollection[]): void {
    // Implement dependency validation logic
    const allModels = new Set(collections.map((c) => c.modelName));

    collections.forEach((collection) => {
      collection.dependencies.forEach((dep) => {
        if (!allModels.has(dep)) {
          throw new Error(
            `Model ${collection.modelName} depends on ${dep} which is not being generated`,
          );
        }
      });
    });
  }

  private calculateStatistics(
    collections: ModelVariantCollection[],
    startTime: number,
  ): GenerationStatistics {
    const totalTime = Date.now() - startTime;
    const variantCounts: Record<VariantType, number> = {
      [VariantType.PURE]: 0,
      [VariantType.INPUT]: 0,
      [VariantType.RESULT]: 0,
    };
    const errorCounts: Record<VariantType, number> = {
      [VariantType.PURE]: 0,
      [VariantType.INPUT]: 0,
      [VariantType.RESULT]: 0,
    };
    const filesSizesKB: Record<string, number> = {};
    const dependencyGraph: Record<string, string[]> = {};

    collections.forEach((collection) => {
      Object.entries(collection.variants).forEach(([variant, result]) => {
        if (result) {
          variantCounts[variant as VariantType]++;
          filesSizesKB[result.filePath] = Buffer.byteLength(result.content, 'utf8') / 1024;
        }
      });

      dependencyGraph[collection.modelName] = Array.from(collection.dependencies);
    });

    return {
      totalTime,
      averageModelTime: totalTime / collections.length,
      variantCounts,
      errorCounts,
      filesSizesKB,
      dependencyGraph,
    };
  }

  private notifyProgress(progress: GenerationProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch {
        // Ignore callback errors to prevent disrupting generation
      }
    });
  }

  /**
   * Public API methods
   */

  /**
   * Add progress callback
   */
  onProgress(callback: (progress: GenerationProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(callback: (progress: GenerationProgress) => void): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): VariantConfigurationManager {
    return this.configManager;
  }

  /**
   * Update configuration
   */
  updateConfiguration(configManager: VariantConfigurationManager): void {
    this.configManager = configManager;
  }
}

export default VariantFileGenerationCoordinator;
