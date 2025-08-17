import { DMMF } from '@prisma/generator-helper';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Common test utilities for prisma-zod-generator test suite
 */

/**
 * Mock DMMF data generator for consistent testing
 */
export class MockDMMFGenerator {
  /**
   * Generate a basic test model for testing
   */
  static createBasicTestModel(modelName: string = 'TestModel'): DMMF.Model {
    return {
      name: modelName,
      dbName: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          isReadOnly: false,
          hasDefaultValue: true,
          type: 'Int',
          default: {
            name: 'autoincrement',
            args: [],
          },
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'email',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: true,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'name',
          kind: 'scalar',
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    };
  }

  /**
   * Generate a model with relationships for testing
   */
  static createModelWithRelations(
    modelName: string = 'User',
    relatedModel: string = 'Post',
  ): DMMF.Model {
    return {
      name: modelName,
      dbName: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          isReadOnly: false,
          hasDefaultValue: true,
          type: 'Int',
          default: {
            name: 'autoincrement',
            args: [],
          },
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'email',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: true,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'posts',
          kind: 'object',
          isList: true,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: relatedModel,
          relationName: `${modelName}${relatedModel}`,
          relationFromFields: [],
          relationToFields: [],
          isGenerated: false,
          isUpdatedAt: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    };
  }

  /**
   * Generate a model with all Prisma field types for comprehensive testing
   */
  static createComprehensiveTestModel(): DMMF.Model {
    return {
      name: 'ComprehensiveTest',
      dbName: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          isReadOnly: false,
          hasDefaultValue: true,
          type: 'Int',
          default: { name: 'autoincrement', args: [] },
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'stringField',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'intField',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'Int',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'booleanField',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'Boolean',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'dateTimeField',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'DateTime',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'optionalString',
          kind: 'scalar',
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'jsonField',
          kind: 'scalar',
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'Json',
          isGenerated: false,
          isUpdatedAt: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    };
  }

  /**
   * Generate a complete DMMF datamodel for testing
   */
  static createTestDatamodel(models: DMMF.Model[] = []): DMMF.Datamodel {
    if (models.length === 0) {
      models = [this.createBasicTestModel()];
    }

    return {
      models,
      enums: [
        {
          name: 'TestEnum',
          values: [
            { name: 'VALUE_ONE', dbName: null },
            { name: 'VALUE_TWO', dbName: null },
          ],
          dbName: null,
        },
      ],
      types: [],
    };
  }
}

/**
 * Configuration test utilities
 */
export class ConfigTestUtils {
  /**
   * Generate a valid test configuration
   */
  static createValidConfig(overrides: Record<string, unknown> = {}) {
    return {
      output: './generated/schemas',
      relationModel: true,
      modelCase: 'PascalCase',
      modelSuffix: 'Schema',
      useMultipleFiles: true,
      createInputTypes: true,
      addIncludeType: false,
      addSelectType: false,
      validateWhereUniqueInput: true,
      prismaClientPath: '@prisma/client',
      ...overrides,
    };
  }

  /**
   * Generate test configuration with filtering options
   */
  static createFilteringConfig(overrides: Record<string, unknown> = {}) {
    return this.createValidConfig({
      models: {
        User: {
          enabled: true,
          operations: ['findMany', 'create', 'update'],
          fields: { exclude: ['password'] },
        },
        Post: {
          enabled: false,
        },
      },
      minimal: false,
      variants: [
        { name: 'input', suffix: 'Input' },
        { name: 'result', suffix: 'Result' },
      ],
      ...overrides,
    });
  }

  /**
   * Generate minimal mode configuration
   */
  static createMinimalConfig(overrides: Record<string, unknown> = {}) {
    return this.createValidConfig({
      minimal: true,
      createInputTypes: false,
      addIncludeType: false,
      addSelectType: false,
      ...overrides,
    });
  }
}

/**
 * Schema validation utilities
 */
export class SchemaValidationUtils {
  /**
   * Check if generated file contains expected Zod schema structure
   */
  static validateZodSchemaFile(filePath: string): boolean {
    if (!existsSync(filePath)) {
      return false;
    }

    const content = readFileSync(filePath, 'utf-8');

    // Check for basic Zod schema patterns
    const hasZodImport = content.includes("import { z } from 'zod'");
    const hasSchemaExport = content.includes('export const') && content.includes('Schema');
    const hasZodSchema =
      content.includes('.object(') || content.includes('.string(') || content.includes('.number(');

    return hasZodImport && hasSchemaExport && hasZodSchema;
  }

  /**
   * Validate that schema contains expected fields
   */
  static validateSchemaFields(filePath: string, expectedFields: string[]): boolean {
    if (!existsSync(filePath)) {
      return false;
    }

    const content = readFileSync(filePath, 'utf-8');

    return expectedFields.every(
      (field) => content.includes(`${field}:`) || content.includes(`"${field}":`),
    );
  }

  /**
   * Validate that schema excludes specific fields
   */
  static validateExcludedFields(filePath: string, excludedFields: string[]): boolean {
    if (!existsSync(filePath)) {
      return false;
    }

    const content = readFileSync(filePath, 'utf-8');

    return excludedFields.every(
      (field) => !content.includes(`${field}:`) && !content.includes(`"${field}":`),
    );
  }

  /**
   * Expect schema content with specific validations
   */
  static expectSchemaContent(
    filePath: string,
    expectations: {
      hasFields?: string[];
      excludesFields?: string[];
      hasValidations?: string[];
      hasImports?: string[];
      hasExports?: string[];
    },
  ): void {
    if (!existsSync(filePath)) {
      throw new Error(`Schema file does not exist: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');

    // Check for expected fields
    if (expectations.hasFields) {
      expectations.hasFields.forEach((field) => {
        if (!content.includes(`${field}:`) && !content.includes(`"${field}":`)) {
          throw new Error(`Expected field '${field}' not found in ${filePath}`);
        }
      });
    }

    // Check for excluded fields
    if (expectations.excludesFields) {
      expectations.excludesFields.forEach((field) => {
        if (content.includes(`${field}:`) || content.includes(`"${field}":`)) {
          throw new Error(`Field '${field}' should be excluded from ${filePath}`);
        }
      });
    }

    // Check for expected validations
    if (expectations.hasValidations) {
      expectations.hasValidations.forEach((validation) => {
        if (!content.includes(validation)) {
          throw new Error(`Expected validation '${validation}' not found in ${filePath}`);
        }
      });
    }

    // Check for expected imports
    if (expectations.hasImports) {
      expectations.hasImports.forEach((importStatement) => {
        if (!content.includes(importStatement)) {
          throw new Error(`Expected import '${importStatement}' not found in ${filePath}`);
        }
      });
    }

    // Check for expected exports
    if (expectations.hasExports) {
      expectations.hasExports.forEach((exportStatement) => {
        if (!content.includes(exportStatement)) {
          throw new Error(`Expected export '${exportStatement}' not found in ${filePath}`);
        }
      });
    }
  }

  /**
   * Validate @zod comment annotations are applied
   */
  static validateZodAnnotations(filePath: string, expectedValidations: string[]): boolean {
    if (!existsSync(filePath)) {
      return false;
    }

    const content = readFileSync(filePath, 'utf-8');

    return expectedValidations.every((validation) => content.includes(validation));
  }
}

/**
 * File system test utilities
 */
export class FileSystemUtils {
  /**
   * Get all generated schema files in a directory
   */
  static getSchemaFiles(dir: string): string[] {
    if (!existsSync(dir)) {
      return [];
    }

    const files = readdirSync(dir, { recursive: true });

    return files
      .filter((file: string) => file.endsWith('.schema.ts'))
      .map((file: string) => join(dir, file));
  }

  /**
   * Count files in directory matching pattern
   */
  static countFiles(dir: string, pattern: RegExp): number {
    if (!existsSync(dir)) {
      return 0;
    }

    const files = readdirSync(dir, { recursive: true });

    return files.filter((file: string) => pattern.test(file)).length;
  }

  /**
   * Check if directory structure matches expected pattern
   */
  static validateDirectoryStructure(baseDir: string, expectedDirs: string[]): boolean {
    return expectedDirs.every((dir) => existsSync(join(baseDir, dir)));
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that all expected files exist
   */
  static expectFilesToExist(files: string[], message?: string): void {
    files.forEach((file) => {
      if (!existsSync(file)) {
        throw new Error(`${message || 'Expected file to exist'}: ${file}`);
      }
    });
  }

  /**
   * Assert that files do not exist
   */
  static expectFilesNotToExist(files: string[], message?: string): void {
    files.forEach((file) => {
      if (existsSync(file)) {
        throw new Error(`${message || 'Expected file not to exist'}: ${file}`);
      }
    });
  }

  /**
   * Assert schema file content matches expectations
   */
  static expectSchemaContent(
    filePath: string,
    expectations: {
      hasFields?: string[];
      excludesFields?: string[];
      hasValidations?: string[];
      hasImports?: string[];
    },
  ): void {
    if (!existsSync(filePath)) {
      throw new Error(`Schema file does not exist: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');

    if (expectations.hasFields) {
      expectations.hasFields.forEach((field) => {
        if (!content.includes(`${field}:`) && !content.includes(`"${field}":`)) {
          throw new Error(`Expected field '${field}' not found in ${filePath}`);
        }
      });
    }

    if (expectations.excludesFields) {
      expectations.excludesFields.forEach((field) => {
        if (content.includes(`${field}:`) || content.includes(`"${field}":`)) {
          throw new Error(`Field '${field}' should be excluded from ${filePath}`);
        }
      });
    }

    if (expectations.hasValidations) {
      expectations.hasValidations.forEach((validation) => {
        if (!content.includes(validation)) {
          throw new Error(`Expected validation '${validation}' not found in ${filePath}`);
        }
      });
    }

    if (expectations.hasImports) {
      expectations.hasImports.forEach((importStmt) => {
        if (!content.includes(importStmt)) {
          throw new Error(`Expected import '${importStmt}' not found in ${filePath}`);
        }
      });
    }
  }
}
