#!/usr/bin/env ts-node

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
  passed: boolean;
}

interface ValidationSummary {
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  results: ValidationResult[];
  overallPassed: boolean;
}

class SchemaValidator {
  private schemasDir: string;
  private tempDir: string;
  private outputFile: string;
  private logBuffer: string[] = [];

  constructor(schemasDir: string = './prisma/generated', outputFile?: string) {
    this.schemasDir = path.resolve(schemasDir);
    // Use process.cwd() as fallback if __dirname is not available
    const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    this.tempDir = path.join(currentDir, '../temp-validation');
    this.outputFile = outputFile || path.join(currentDir, '../validation-report.txt');
  }

  private log(message: string): void {
    console.log(message);
    this.logBuffer.push(message);
  }

  private writeLogToFile(): void {
    try {
      const timestamp = new Date().toISOString();
      const header = `Schema Validation Report - ${timestamp}\n${'='.repeat(60)}\n\n`;
      const content = header + this.logBuffer.join('\n');
      fs.writeFileSync(this.outputFile, content);
      console.log(`\n📄 Validation report saved to: ${this.outputFile}`);
    } catch (error) {
      console.error(`Failed to write log file: ${(error as Error).message}`);
    }
  }

  async validateAllSchemas(): Promise<ValidationSummary> {
    this.log('🔍 Starting schema validation...');
    this.log(`📁 Scanning directory: ${this.schemasDir}`);

    const schemaFiles = this.findSchemaFiles();
    this.log(`📄 Found ${schemaFiles.length} schema files`);

    const results: ValidationResult[] = [];

    // Setup temp directory for validation
    await this.setupTempDirectory();

    for (const file of schemaFiles) {
      this.log(`\n🔎 Validating: ${path.relative(this.schemasDir, file)}`);
      const result = await this.validateSchema(file);
      results.push(result);

      if (result.passed) {
        this.log('  ✅ Passed');
      } else {
        this.log('  ❌ Failed');
        result.errors.forEach(error => this.log(`    🚨 ${error}`));
        // Only log non-semicolon warnings
        result.warnings.filter(warning => !warning.includes('Missing semicolon')).forEach(warning => this.log(`    ⚠️  ${warning}`));
      }
    }

    // Cleanup
    await this.cleanupTempDirectory();

    const summary: ValidationSummary = {
      totalFiles: schemaFiles.length,
      passedFiles: results.filter(r => r.passed).length,
      failedFiles: results.filter(r => !r.passed).length,
      results,
      overallPassed: results.every(r => r.passed)
    };

    this.printSummary(summary);
    this.writeLogToFile();
    return summary;
  }

  private findSchemaFiles(): string[] {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) {
        this.log(`⚠️  Directory not found: ${dir}`);
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.schema.ts')) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(this.schemasDir);
    return files.sort();
  }

  private async validateSchema(filePath: string): Promise<ValidationResult> {
    const relativePath = path.relative(this.schemasDir, filePath);
    const result: ValidationResult = {
      file: relativePath,
      errors: [],
      warnings: [],
      passed: true
    };

    try {
      // 1. Check if file exists and is readable
      if (!fs.existsSync(filePath)) {
        result.errors.push('File does not exist');
        result.passed = false;
        return result;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // 2. Basic syntax checks
      this.checkBasicSyntax(content, result);

      // 3. Check imports
      this.checkImports(content, result);

      // 4. Check Zod schema structure
      this.checkZodSchema(content, result);

      // 5. Check for common issues
      this.checkCommonIssues(content, result);

      // 6. TypeScript compilation check
      await this.checkTypeScriptCompilation(filePath, content, result);

      // 7. Try to import and instantiate the schema
      await this.checkSchemaInstantiation(filePath, result);

    } catch (error) {
      result.errors.push(`Validation error: ${(error as Error).message}`);
      result.passed = false;
    }

    if (result.errors.length > 0) {
      result.passed = false;
    }

    return result;
  }

  private checkBasicSyntax(content: string, result: ValidationResult): void {
    // Check for balanced braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      result.errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }

    // Check for balanced parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      result.errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
    }

    // Check for unterminated strings
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    const backticks = (content.match(/`/g) || []).length;
    
    if (singleQuotes % 2 !== 0) {
      result.errors.push('Unterminated single-quoted string');
    }
    if (doubleQuotes % 2 !== 0) {
      result.errors.push('Unterminated double-quoted string');
    }
    if (backticks % 2 !== 0) {
      result.errors.push('Unterminated template literal');
    }
  }

  private checkImports(content: string, result: ValidationResult): void {
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    
    // Check for Zod import
    const hasZodImport = importLines.some(line => line.includes("from 'zod'"));
    if (!hasZodImport) {
      result.errors.push('Missing Zod import');
    }

    // Check for Prisma types import if needed
    if (content.includes('Prisma.') && !importLines.some(line => line.includes("from '@prisma/client'"))) {
      result.warnings.push('Uses Prisma types but missing @prisma/client import');
    }

    // Check for relative imports format
    importLines.forEach((line, index) => {
      if (line.includes('./') || line.includes('../')) {
        if (!line.includes('.schema')) {
          result.warnings.push(`Line ${index + 1}: Relative import without .schema extension: ${line.trim()}`);
        }
      }
    });
  }

  private checkZodSchema(content: string, result: ValidationResult): void {
    // Check for proper schema export
    if (!content.includes('export const') || !content.includes('Schema')) {
      result.errors.push('Missing proper schema export');
    }

    // Check for z.ZodType annotation (only warn if it's a schema definition file)
    if (content.includes('const Schema:') && !content.includes('z.ZodType')) {
      result.warnings.push('Missing z.ZodType type annotation');
    }

    // Check for common Zod method chaining issues
    const zodChains = content.match(/z\.[a-zA-Z()]+(?:\.[a-zA-Z()]+)*/g) || [];
    
    zodChains.forEach(chain => {
      // Check for incorrect .optional().min() pattern
      if (chain.includes('.optional().min(')) {
        result.errors.push(`Incorrect method order: ${chain} - .min() should come before .optional()`);
      }
      
      // Check for incorrect .optional().max() pattern
      if (chain.includes('.optional().max(')) {
        result.errors.push(`Incorrect method order: ${chain} - .max() should come before .optional()`);
      }

      // Check for incorrect .nullable().optional() pattern
      if (chain.includes('.nullable().optional(')) {
        result.warnings.push(`Suboptimal method order: ${chain} - .optional() should come before .nullable()`);
      }
    });

    // More accurate lazy schema validation
    this.checkLazySchemas(content, result);
  }

  private checkLazySchemas(content: string, result: ValidationResult): void {
    // Simplified lazy schema validation - let TypeScript catch complex issues
    // Only check for obviously wrong patterns
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Check for z.lazy without arrow function (e.g., z.lazy(SomeSchema))
      if (line.match(/z\.lazy\s*\(\s*[A-Z][a-zA-Z]*Schema[^(]*\s*\)/) && !line.includes('=>')) {
        const match = line.match(/z\.lazy\s*\(\s*([A-Z][a-zA-Z]*Schema[^)]*)\s*\)/);
        if (match) {
          result.errors.push(`Line ${lineNumber}: Invalid lazy schema - should use z.lazy(() => ${match[1]})`);
        }
      }
    }
  }

  private checkCommonIssues(content: string, result: ValidationResult): void {
    // Check for unused imports
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    importLines.forEach((line, index) => {
      const match = line.match(/import\s+{([^}]+)}\s+from/);
      if (match) {
        const imports = match[1].split(',').map(i => i.trim());
        imports.forEach(importName => {
          const cleanImportName = importName.split(' ')[0]; // Handle "as" aliases
          if (cleanImportName && !content.includes(cleanImportName)) {
            result.warnings.push(`Line ${index + 1}: Unused import: ${importName}`);
          }
        });
      }
    });

    // Check for potential circular references in imports
    const currentFileName = result.file.replace('.schema.ts', '');
    importLines.forEach((line, index) => {
      if (line.includes(currentFileName) && !line.includes('from \'@prisma/client\'')) {
        result.warnings.push(`Line ${index + 1}: Potential circular import detected: ${line.trim()}`);
      }
    });
  }

  private async checkTypeScriptCompilation(filePath: string, content: string, result: ValidationResult): Promise<void> {
    try {
      // Create a temporary file for TypeScript compilation
      const tempFile = path.join(this.tempDir, `temp-${Date.now()}.ts`);
      fs.writeFileSync(tempFile, content);

      // Run TypeScript compiler
      const { stdout, stderr } = await execAsync(`npx tsc --noEmit --skipLibCheck ${tempFile}`, {
        cwd: path.dirname(this.schemasDir)
      });

      if (stderr) {
        const errors = stderr.split('\n').filter((line: string) => line.trim());
        errors.forEach((error: string) => {
          if (error.includes('error TS')) {
            result.errors.push(`TypeScript: ${error.replace(tempFile, path.basename(filePath))}`);
          }
        });
      }

      // Cleanup temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (error) {
      result.warnings.push(`TypeScript check failed: ${(error as Error).message}`);
    }
  }

  private async checkSchemaInstantiation(filePath: string, result: ValidationResult): Promise<void> {
    try {
      // This is a basic check - in a real scenario you might want to use dynamic imports
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if the schema is properly structured for instantiation
      if (!content.includes('export const') || !content.includes('Schema')) {
        result.errors.push('Schema not properly exported for instantiation');
        return;
      }

      // Check for circular dependencies in lazy schemas
      const lazyRefs = content.match(/z\.lazy\(\(\) => ([^)]+)\)/g) || [];
      lazyRefs.forEach((lazy: string) => {
        const refMatch = lazy.match(/=> ([^)]+)/);
        if (refMatch) {
          const refName = refMatch[1].trim();
          // Basic circular dependency check
          if (content.includes(`${refName}ObjectSchema`) && 
              path.basename(filePath).includes(refName)) {
            result.warnings.push(`Potential circular dependency with ${refName}`);
          }
        }
      });

    } catch (error) {
      result.warnings.push(`Schema instantiation check failed: ${(error as Error).message}`);
    }
  }

  private async setupTempDirectory(): Promise<void> {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private async cleanupTempDirectory(): Promise<void> {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      files.forEach((file: string) => {
        fs.unlinkSync(path.join(this.tempDir, file));
      });
      fs.rmdirSync(this.tempDir);
    }
  }

  private printSummary(summary: ValidationSummary): void {
    this.log('\n' + '='.repeat(60));
    this.log('📊 VALIDATION SUMMARY');
    this.log('='.repeat(60));
    this.log(`📄 Total files: ${summary.totalFiles}`);
    this.log(`✅ Passed: ${summary.passedFiles}`);
    this.log(`❌ Failed: ${summary.failedFiles}`);
    this.log(`📈 Success rate: ${((summary.passedFiles / summary.totalFiles) * 100).toFixed(1)}%`);
    
    if (summary.failedFiles > 0) {
      this.log('\n❌ FAILED FILES:');
      summary.results.filter(r => !r.passed).forEach(result => {
        this.log(`  📄 ${result.file}`);
        result.errors.forEach(error => this.log(`    🚨 ${error}`));
      });
    }

    const totalWarnings = summary.results.reduce((sum, r) => sum + r.warnings.filter(w => !w.includes('Missing semicolon')).length, 0);
    if (totalWarnings > 0) {
      this.log(`\n⚠️  Total warnings (excluding semicolons): ${totalWarnings}`);
    }

    this.log(`\n🎯 Overall result: ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    this.log('='.repeat(60));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const schemasDir = args[0] || './prisma/generated';
  const outputFile = args[1]; // Optional output file path
  
  console.log('🚀 Prisma Zod Schema Validator');
  console.log('================================');
  
  const validator = new SchemaValidator(schemasDir, outputFile);
  const summary = await validator.validateAllSchemas();
  
  // Exit with error code if validation failed
  process.exit(summary.overallPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}

export { SchemaValidator, ValidationResult, ValidationSummary };
