/**
 * Variant Import/Export Management System
 * Manages TypeScript imports and exports across variants including barrel exports and cross-variant references
 */

import { VariantType, ModelVariantCollection, VariantGenerationResult } from '../types/variants';
import { writeFileSafely } from '../utils/writeFileSafely';
import { formatFile } from '../utils/formatFile';
import { promises as fs } from 'fs';

/**
 * Import statement configuration
 */
export interface ImportStatement {
  moduleSpecifier: string;
  namedImports: string[];
  defaultImport?: string;
  namespaceImport?: string;
  isTypeOnly?: boolean;
}

/**
 * Export statement configuration
 */
export interface ExportStatement {
  namedExports: string[];
  moduleSpecifier?: string; // For re-exports
  defaultExport?: string;
  namespaceExport?: string;
  isTypeOnly?: boolean;
}

/**
 * Barrel export configuration
 */
export interface BarrelExportConfig {
  variantType: VariantType;
  includeTypes: boolean;
  includeSchemas: boolean;
  groupByModel: boolean;
  customHeader?: string;
  sortExports: boolean;
}

/**
 * Cross-variant reference mapping
 */
export interface CrossVariantReference {
  sourceVariant: VariantType;
  targetVariant: VariantType;
  referencedItems: string[];
  referenceType: 'import' | 'extends' | 'utility';
}

/**
 * Module resolution configuration
 */
export interface ModuleResolutionConfig {
  baseUrl: string;
  paths: Record<string, string[]>;
  extensions: string[];
  useRelativePaths: boolean;
  pathMapping: Record<string, string>;
}

/**
 * Export validation result
 */
export interface ExportValidationResult {
  isValid: boolean;
  circularDependencies: string[][];
  unresolvedImports: string[];
  duplicateExports: string[];
  warnings: string[];
}

/**
 * Variant Import/Export Manager
 * Central manager for handling all import/export operations across variants
 */
export class VariantImportExportManager {
  private moduleResolutionConfig: ModuleResolutionConfig;
  private globalImports: Set<string> = new Set();
  private exportCache: Map<string, ExportStatement[]> = new Map();

  constructor(moduleResolutionConfig?: Partial<ModuleResolutionConfig>) {
    this.moduleResolutionConfig = {
      baseUrl: './generated/schemas',
      paths: {},
      extensions: ['.ts', '.js'],
      useRelativePaths: true,
      pathMapping: {},
      ...moduleResolutionConfig,
    };
  }

  /**
   * Generate barrel export files for all variant types
   */
  async generateBarrelExports(
    collections: ModelVariantCollection[],
    configs: Record<VariantType, BarrelExportConfig>,
  ): Promise<{
    files: Array<{
      path: string;
      content: string;
      exports: string[];
    }>;
    mainIndex: {
      path: string;
      content: string;
      exports: string[];
    };
  }> {
    const generatedFiles: Array<{ path: string; content: string; exports: string[] }> = [];

    // Generate barrel export for each variant type
    for (const [variantType, config] of Object.entries(configs)) {
      const variant = variantType as VariantType;
      const barrelFile = await this.generateVariantBarrelExport(collections, variant, config);
      generatedFiles.push(barrelFile);
    }

    // Generate main index file
    const mainIndex = await this.generateMainIndexFile(generatedFiles);

    return {
      files: generatedFiles,
      mainIndex,
    };
  }

  /**
   * Generate barrel export for a specific variant type
   */
  private async generateVariantBarrelExport(
    collections: ModelVariantCollection[],
    variantType: VariantType,
    config: BarrelExportConfig,
  ): Promise<{ path: string; content: string; exports: string[] }> {
    const exports: ExportStatement[] = [];
    const allExports: string[] = [];

    // Collect exports from all models for this variant
    collections.forEach((collection) => {
      const variant = collection.variants[variantType];
      if (variant) {
        const modelExports: string[] = [];

        if (config.includeSchemas) {
          modelExports.push(variant.schemaName);
        }
        if (config.includeTypes) {
          modelExports.push(variant.typeName);
        }

        if (modelExports.length > 0) {
          const moduleSpecifier = this.resolveModulePath(variant.filePath, variantType);
          exports.push({
            namedExports: modelExports,
            moduleSpecifier,
            isTypeOnly: false,
          });
          allExports.push(...modelExports);
        }
      }
    });

    // Sort exports if requested
    if (config.sortExports) {
      exports.sort((a, b) => (a.moduleSpecifier || '').localeCompare(b.moduleSpecifier || ''));
      allExports.sort();
    }

    // Generate file content
    const content = this.generateBarrelFileContent(exports, variantType, config);
    const formattedContent = await formatFile(content);

    const filePath = `${this.moduleResolutionConfig.baseUrl}/${variantType}.ts`;

    // Write to disk
    await writeFileSafely(filePath, formattedContent);

    return {
      path: filePath,
      content: formattedContent,
      exports: allExports,
    };
  }

  /**
   * Generate main index file that exports all variant barrels
   */
  private async generateMainIndexFile(
    barrelFiles: Array<{ path: string; content: string; exports: string[] }>,
  ): Promise<{ path: string; content: string; exports: string[] }> {
    const exports: ExportStatement[] = [];
    const allExports: string[] = [];

    // Create re-exports for each barrel file
    barrelFiles.forEach((barrelFile) => {
      const variantType = this.extractVariantTypeFromPath(barrelFile.path);
      if (variantType) {
        exports.push({
          namedExports: ['*'],
          moduleSpecifier: `./${variantType}`,
          namespaceExport: variantType,
        });
        allExports.push(...barrelFile.exports);
      }
    });

    // Generate content
    const content = this.generateMainIndexContent(exports);
    const formattedContent = await formatFile(content);

    const filePath = `${this.moduleResolutionConfig.baseUrl}/index.ts`;

    // Write to disk
    await writeFileSafely(filePath, formattedContent);

    return {
      path: filePath,
      content: formattedContent,
      exports: allExports,
    };
  }

  /**
   * Handle cross-variant references
   */
  async manageCrossVariantReferences(
    collections: ModelVariantCollection[],
  ): Promise<CrossVariantReference[]> {
    const references: CrossVariantReference[] = [];

    // Analyze each collection for cross-variant dependencies
    collections.forEach((collection) => {
      Object.entries(collection.crossVariantReferences).forEach(
        ([sourceVariant, targetVariants]) => {
          const source = sourceVariant as VariantType;

          targetVariants.forEach((targetVariant) => {
            const sourceResult = collection.variants[source];
            const targetResult = collection.variants[targetVariant];

            if (sourceResult && targetResult) {
              // Determine what items are referenced
              const referencedItems = this.findReferencedItems(sourceResult, targetResult);

              if (referencedItems.length > 0) {
                references.push({
                  sourceVariant: source,
                  targetVariant,
                  referencedItems,
                  referenceType: this.determineReferenceType(source, targetVariant),
                });
              }
            }
          });
        },
      );
    });

    // Update files with cross-variant imports
    await this.updateFilesWithCrossVariantImports(collections, references);

    return references;
  }

  /**
   * Update files with cross-variant imports
   */
  private async updateFilesWithCrossVariantImports(
    collections: ModelVariantCollection[],
    references: CrossVariantReference[],
  ): Promise<void> {
    // Group references by source file
    const referencesBySource = new Map<string, CrossVariantReference[]>();

    references.forEach((ref) => {
      collections.forEach((collection) => {
        const sourceVariant = collection.variants[ref.sourceVariant];
        if (sourceVariant) {
          const sourceFile = sourceVariant.filePath;
          if (!referencesBySource.has(sourceFile)) {
            referencesBySource.set(sourceFile, []);
          }
          const refs = referencesBySource.get(sourceFile);
          if (refs) {
            refs.push(ref);
          }
        }
      });
    });

    // Update each source file with necessary imports
    for (const [sourceFile, fileReferences] of referencesBySource) {
      await this.addImportsToFile(sourceFile, fileReferences);
    }
  }

  /**
   * Add imports to a specific file
   */
  private async addImportsToFile(
    filePath: string,
    references: CrossVariantReference[],
  ): Promise<void> {
    try {
      let content = await fs.readFile(filePath, 'utf8');

      // Generate import statements
      const importStatements = this.generateImportStatements(references);

      // Insert imports at the top of the file
      const importSection = importStatements
        .map((imp) => this.formatImportStatement(imp))
        .join('\n');

      if (importSection) {
        // Find the position to insert imports (after existing imports but before other code)
        const importInsertionPoint = this.findImportInsertionPoint(content);
        content =
          content.slice(0, importInsertionPoint) +
          importSection +
          '\n' +
          content.slice(importInsertionPoint);
      }

      // Format and write back
      const formattedContent = await formatFile(content);
      await writeFileSafely(filePath, formattedContent);
    } catch (error) {
      console.warn(`Failed to update imports in ${filePath}:`, error);
    }
  }

  /**
   * Validate export consistency and detect issues
   */
  validateExports(collections: ModelVariantCollection[]): ExportValidationResult {
    const result: ExportValidationResult = {
      isValid: true,
      circularDependencies: [],
      unresolvedImports: [],
      duplicateExports: [],
      warnings: [],
    };

    // Check for duplicate exports across variants
    const allExports = new Map<string, VariantType[]>();
    collections.forEach((collection) => {
      Object.entries(collection.variants).forEach(([variant, result]) => {
        if (result) {
          result.exports.forEach((exportName) => {
            if (!allExports.has(exportName)) {
              allExports.set(exportName, []);
            }
            const variants = allExports.get(exportName);
            if (variants) {
              variants.push(variant as VariantType);
            }
          });
        }
      });
    });

    // Find duplicates
    allExports.forEach((variants, exportName) => {
      if (variants.length > 1) {
        result.duplicateExports.push(`${exportName} (in ${variants.join(', ')})`);
        result.isValid = false;
      }
    });

    // Check for circular dependencies
    result.circularDependencies = this.detectCircularDependencies(collections);
    if (result.circularDependencies.length > 0) {
      result.isValid = false;
    }

    // Validate import resolution
    result.unresolvedImports = this.findUnresolvedImports(collections);
    if (result.unresolvedImports.length > 0) {
      result.warnings.push(
        `Found ${result.unresolvedImports.length} potentially unresolved imports`,
      );
    }

    return result;
  }

  /**
   * Private helper methods
   */

  private generateBarrelFileContent(
    exports: ExportStatement[],
    variantType: VariantType,
    config: BarrelExportConfig,
  ): string {
    const lines: string[] = [];

    // Add custom header or default header
    lines.push('/**');
    if (config.customHeader) {
      lines.push(` * ${config.customHeader}`);
    } else {
      lines.push(` * ${variantType.toUpperCase()} Variant Schemas`);
    }
    lines.push(' * Auto-generated barrel export file');
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(' */');
    lines.push('');

    // Add export statements
    exports.forEach((exportStmt) => {
      if (exportStmt.moduleSpecifier) {
        const exportList = exportStmt.namedExports.join(', ');
        lines.push(`export { ${exportList} } from '${exportStmt.moduleSpecifier}';`);
      }
    });

    lines.push('');
    return lines.join('\n');
  }

  private generateMainIndexContent(exports: ExportStatement[]): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Main Schema Variants Index');
    lines.push(' * Auto-generated file - exports all variant types');
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(' */');
    lines.push('');

    // Add re-exports
    exports.forEach((exportStmt) => {
      if (exportStmt.moduleSpecifier) {
        if (exportStmt.namespaceExport) {
          lines.push(
            `export * as ${exportStmt.namespaceExport} from '${exportStmt.moduleSpecifier}';`,
          );
        } else {
          lines.push(`export * from '${exportStmt.moduleSpecifier}';`);
        }
      }
    });

    lines.push('');
    return lines.join('\n');
  }

  private resolveModulePath(filePath: string, variantType: VariantType): string {
    if (this.moduleResolutionConfig.useRelativePaths) {
      // Extract filename without extension
      const fileName = filePath.split('/').pop()?.replace('.ts', '') || '';
      return `./${variantType}/${fileName}`;
    }
    return filePath;
  }

  private extractVariantTypeFromPath(path: string): VariantType | null {
    const fileName = path.split('/').pop()?.replace('.ts', '');
    return Object.values(VariantType).find((variant) => variant === fileName) || null;
  }

  private findReferencedItems(
    source: VariantGenerationResult,
    target: VariantGenerationResult,
  ): string[] {
    // This would analyze the content to find actual references
    // For now, return basic schema/type references
    const references: string[] = [];

    if (source.content.includes(target.schemaName)) {
      references.push(target.schemaName);
    }
    if (source.content.includes(target.typeName)) {
      references.push(target.typeName);
    }

    return references;
  }

  private determineReferenceType(
    source: VariantType,
    target: VariantType,
  ): 'import' | 'extends' | 'utility' {
    // Determine the type of reference based on variant relationship
    if (source === VariantType.INPUT && target === VariantType.PURE) {
      return 'extends';
    }
    if (source === VariantType.RESULT && target === VariantType.PURE) {
      return 'utility';
    }
    return 'import';
  }

  private generateImportStatements(references: CrossVariantReference[]): ImportStatement[] {
    const importsByModule = new Map<string, Set<string>>();

    references.forEach((ref) => {
      const moduleSpecifier = `./${ref.targetVariant}`;
      if (!importsByModule.has(moduleSpecifier)) {
        importsByModule.set(moduleSpecifier, new Set());
      }
      ref.referencedItems.forEach((item) => {
        const imports = importsByModule.get(moduleSpecifier);
        if (imports) {
          imports.add(item);
        }
      });
    });

    return Array.from(importsByModule.entries()).map(([moduleSpecifier, imports]) => ({
      moduleSpecifier,
      namedImports: Array.from(imports),
      isTypeOnly: false,
    }));
  }

  private formatImportStatement(importStmt: ImportStatement): string {
    const parts: string[] = [];

    if (importStmt.defaultImport) {
      parts.push(importStmt.defaultImport);
    }

    if (importStmt.namedImports.length > 0) {
      const namedList = importStmt.namedImports.join(', ');
      parts.push(`{ ${namedList} }`);
    }

    if (importStmt.namespaceImport) {
      parts.push(`* as ${importStmt.namespaceImport}`);
    }

    const importList = parts.join(', ');
    const typeOnly = importStmt.isTypeOnly ? 'type ' : '';

    return `import ${typeOnly}${importList} from '${importStmt.moduleSpecifier}';`;
  }

  private findImportInsertionPoint(content: string): number {
    // Find the end of existing imports or the beginning of the file
    const lines = content.split('\n');
    let insertionLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || (line.startsWith('export ') && line.includes('from'))) {
        insertionLine = i + 1;
      } else if (
        line &&
        !line.startsWith('//') &&
        !line.startsWith('/*') &&
        !line.startsWith('*')
      ) {
        break;
      }
    }

    // Convert line number back to character position
    return lines.slice(0, insertionLine).join('\n').length + (insertionLine > 0 ? 1 : 0);
  }

  private detectCircularDependencies(collections: ModelVariantCollection[]): string[][] {
    // Implement circular dependency detection using DFS
    const dependencies = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[][] = [];

    // Build dependency graph
    collections.forEach((collection) => {
      const modelName = collection.modelName;
      dependencies.set(modelName, Array.from(collection.dependencies));
    });

    // DFS to detect cycles
    const detectCycle = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          circularDeps.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const deps = dependencies.get(node) || [];
      deps.forEach((dep) => {
        detectCycle(dep, [...path, node]);
      });

      recursionStack.delete(node);
    };

    dependencies.forEach((_, node) => {
      if (!visited.has(node)) {
        detectCycle(node, []);
      }
    });

    return circularDeps;
  }

  private findUnresolvedImports(collections: ModelVariantCollection[]): string[] {
    const unresolved: string[] = [];
    const availableExports = new Set<string>();

    // Collect all available exports
    collections.forEach((collection) => {
      Object.values(collection.variants).forEach((variant) => {
        if (variant) {
          variant.exports.forEach((exp) => availableExports.add(exp));
        }
      });
    });

    // Check each import against available exports
    collections.forEach((collection) => {
      Object.values(collection.variants).forEach((variant) => {
        if (variant) {
          variant.imports.forEach((imp) => {
            if (!availableExports.has(imp) && !this.isExternalImport(imp)) {
              unresolved.push(`${imp} in ${variant.fileName}`);
            }
          });
        }
      });
    });

    return unresolved;
  }

  private isExternalImport(importName: string): boolean {
    // Check if import is from external libraries (like 'zod', '@prisma/client', etc.)
    const externalLibraries = ['zod', '@prisma/client', 'prisma'];
    return (
      externalLibraries.some((lib) => importName.startsWith(lib)) || importName.startsWith('z.')
    );
  }
}

export default VariantImportExportManager;
