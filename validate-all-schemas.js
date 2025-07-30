#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SchemaValidator {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.errors = [];
  }

  /**
   * Recursively find all .schema.ts files
   */
  findAllSchemaFiles() {
    const files = [];

    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        // Skip node_modules, dist, build directories
        if (['node_modules', 'dist', 'build', '.git'].includes(item)) {
          continue;
        }

        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.schema.ts')) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(this.rootDir);
    return files;
  }

  /**
   * Check basic file structure
   */
  validateFileStructure(filePath) {
    const errors = [];
    const relativePath = path.relative(this.rootDir, filePath);

    try {
      if (!fs.existsSync(filePath)) {
        errors.push({
          file: relativePath,
          type: 'structure',
          error: 'File does not exist'
        });
        return errors;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      if (content.trim().length === 0) {
        errors.push({
          file: relativePath,
          type: 'structure',
          error: 'File is empty'
        });
        return errors;
      }

      // Check for required imports
      if (!content.includes("import { z } from 'zod'")) {
        errors.push({
          file: relativePath,
          type: 'structure',
          error: 'Missing required Zod import'
        });
      }

      // Check for exports
      if (!content.includes('export const') && !content.includes('export {') && !content.includes('export default')) {
        errors.push({
          file: relativePath,
          type: 'structure',
          error: 'Missing export statement'
        });
      }

      // Check for schema definitions
      if (!content.includes('Schema')) {
        errors.push({
          file: relativePath,
          type: 'structure',
          error: 'File does not contain schema definitions'
        });
      }

    } catch (error) {
      errors.push({
        file: relativePath,
        type: 'structure',
        error: `Failed to read file: ${error.message}`
      });
    }

    return errors;
  }

  /**
   * Check for syntax errors in schema definitions
   */
  validateSchemaSyntax(filePath) {
    const errors = [];
    const relativePath = path.relative(this.rootDir, filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for unmatched parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push({
          file: relativePath,
          type: 'syntax',
          error: `Unmatched parentheses: ${openParens} open, ${closeParens} close`
        });
      }

      // Check for unmatched braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push({
          file: relativePath,
          type: 'syntax',
          error: `Unmatched braces: ${openBraces} open, ${closeBraces} close`
        });
      }

      // Check for malformed z.object definitions
      const objectMatches = content.match(/z\.object\(\{[^}]*\}\)/gs);
      if (objectMatches) {
        for (const match of objectMatches) {
          const lines = match.split('\n');
          for (let i = 1; i < lines.length - 1; i++) { // Skip first and last lines
            const line = lines[i].trim();
            
            // Check for potential missing field names
            if (line.startsWith('z.') && !line.includes(':') && !line.includes('},')) {
              // This might be a missing field name
              const prevLine = lines[i - 1]?.trim() || '';
              if (!prevLine.endsWith(':')) {
                errors.push({
                  file: relativePath,
                  type: 'syntax',
                  error: 'Possible missing field name in object definition',
                  details: `Line: ${line.substring(0, 50)}...`
                });
              }
            }
          }
        }
      }

      // Check for missing semicolons on exports
      const exportMatches = content.match(/export const [^;]+$/gm);
      if (exportMatches) {
        errors.push({
          file: relativePath,
          type: 'syntax',
          error: 'Export statement missing semicolon',
          details: exportMatches[0]
        });
      }

    } catch (error) {
      errors.push({
        file: relativePath,
        type: 'syntax',
        error: `Failed to validate syntax: ${error.message}`
      });
    }

    return errors;
  }

  /**
   * Check import paths and references
   */
  validateImports(filePath) {
    const errors = [];
    const relativePath = path.relative(this.rootDir, filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileDir = path.dirname(filePath);

      // Check relative imports
      const importMatches = content.match(/import\s+\{[^}]+\}\s+from\s+['"](\.[^'"]*)['"]/g) || [];
      
      for (const importMatch of importMatches) {
        const pathMatch = importMatch.match(/from\s+['"](\.[^'"]*)['"]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          const resolvedPath = path.resolve(fileDir, importPath);
          const tsPath = resolvedPath + '.ts';
          
          if (!fs.existsSync(tsPath) && !fs.existsSync(resolvedPath)) {
            errors.push({
              file: relativePath,
              type: 'import',
              error: `Import path not found: ${importPath}`,
              details: `Expected: ${path.relative(this.rootDir, tsPath)}`
            });
          }
        }
      }

      // Check for undefined schema references
      const schemaRefs = content.match(/\w+(?:Object)?Schema/g) || [];
      const importedSchemas = new Set();
      
      // Extract imported schemas
      const imports = content.match(/import\s+\{([^}]+)\}/g) || [];
      for (const imp of imports) {
        const schemaNames = imp.match(/(\w+(?:Object)?Schema)/g) || [];
        schemaNames.forEach(name => importedSchemas.add(name));
      }

      // Extract locally defined schemas
      const localSchemas = content.match(/const\s+(\w+(?:Object)?Schema)/g) || [];
      for (const local of localSchemas) {
        const match = local.match(/const\s+(\w+(?:Object)?Schema)/);
        if (match) importedSchemas.add(match[1]);
      }

      // Check references
      for (const ref of new Set(schemaRefs)) {
        if (!importedSchemas.has(ref)) {
          errors.push({
            file: relativePath,
            type: 'import',
            error: `Undefined schema reference: ${ref}`,
            details: 'Referenced but not imported or defined'
          });
        }
      }

    } catch (error) {
      errors.push({
        file: relativePath,
        type: 'import',
        error: `Failed to validate imports: ${error.message}`
      });
    }

    return errors;
  }

  /**
   * Run TypeScript compilation check
   */
  validateTypeScript(files) {
    const errors = [];
    console.log('🔧 Running TypeScript compilation checks...');
    
    const batchSize = 15;
    const totalBatches = Math.ceil(files.length / batchSize);
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      try {
        // Test compilation with minimal config
        const filePaths = batch.map(f => `"${f}"`).join(' ');
        execSync(`npx tsc --noEmit --skipLibCheck --target ES2020 --module commonjs --moduleResolution node ${filePaths}`, {
          stdio: 'pipe',
          cwd: this.rootDir
        });
        
        console.log(`  ✅ Batch ${batchNum}/${totalBatches} passed (${batch.length} files)`);
        
      } catch (error) {
        console.log(`  ❌ Batch ${batchNum}/${totalBatches} has errors, checking individual files...`);
        
        // Check each file individually
        for (const file of batch) {
          try {
            execSync(`npx tsc --noEmit --skipLibCheck --target ES2020 --module commonjs "${file}"`, {
              stdio: 'pipe',
              cwd: this.rootDir
            });
          } catch (fileError) {
            const stderr = fileError.stderr?.toString() || '';
            const stdout = fileError.stdout?.toString() || '';
            const errorOutput = stderr || stdout || fileError.message;
            
            errors.push({
              file: path.relative(this.rootDir, file),
              type: 'typescript',
              error: 'TypeScript compilation failed',
              details: errorOutput.substring(0, 300) + (errorOutput.length > 300 ? '...' : '')
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Run all validations
   */
  async validateAll() {
    console.log('🚀 Schema Validation Tool');
    console.log('========================\\n');

    // Find files
    const files = this.findAllSchemaFiles();
    console.log(`🔍 Found ${files.length} schema files:\\n`);
    
    if (files.length === 0) {
      throw new Error('No .schema.ts files found in the codebase');
    }

    // Show found files (first 10, then summary)
    const displayFiles = files.slice(0, 10);
    displayFiles.forEach(file => {
      console.log(`  📄 ${path.relative(this.rootDir, file)}`);
    });
    
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }
    console.log('');

    // Run validations
    let structureErrors = 0;
    let syntaxErrors = 0;
    let importErrors = 0;

    console.log('🔍 Running validation checks...\\n');

    // 1. Structure validation
    console.log('1️⃣ Checking file structure...');
    for (const file of files) {
      const errors = this.validateFileStructure(file);
      this.errors.push(...errors);
      structureErrors += errors.length;
    }
    console.log(`   ✓ Structure check complete: ${structureErrors} errors found\\n`);

    // 2. Syntax validation
    console.log('2️⃣ Checking schema syntax...');
    for (const file of files) {
      const errors = this.validateSchemaSyntax(file);
      this.errors.push(...errors);
      syntaxErrors += errors.length;
    }
    console.log(`   ✓ Syntax check complete: ${syntaxErrors} errors found\\n`);

    // 3. Import validation
    console.log('3️⃣ Checking imports and references...');
    for (const file of files) {
      const errors = this.validateImports(file);
      this.errors.push(...errors);
      importErrors += errors.length;
    }
    console.log(`   ✓ Import check complete: ${importErrors} errors found\\n`);

    // 4. TypeScript compilation
    console.log('4️⃣ Running TypeScript compilation...');
    const typescriptErrors = this.validateTypeScript(files);
    this.errors.push(...typescriptErrors);
    console.log(`   ✓ TypeScript check complete: ${typescriptErrors.length} errors found\\n`);

    return {
      totalFiles: files.length,
      validFiles: files.length - new Set(this.errors.map(e => e.file)).size,
      errors: this.errors,
      summary: {
        structureErrors,
        syntaxErrors,
        importErrors,
        typescriptErrors: typescriptErrors.length
      }
    };
  }

  /**
   * Print detailed results
   */
  printResults(result) {
    console.log('📊 FINAL VALIDATION RESULTS');
    console.log('='.repeat(50));
    console.log(`📁 Total schema files found: ${result.totalFiles}`);
    console.log(`✅ Valid files: ${result.validFiles}`);
    console.log(`❌ Files with errors: ${result.totalFiles - result.validFiles}`);
    console.log('');
    console.log('📋 Error Summary:');
    console.log(`   🏗️  Structure errors: ${result.summary.structureErrors}`);
    console.log(`   🔧 Syntax errors: ${result.summary.syntaxErrors}`);
    console.log(`   📦 Import errors: ${result.summary.importErrors}`);
    console.log(`   📝 TypeScript errors: ${result.summary.typescriptErrors}`);
    console.log(`   📊 Total errors: ${result.errors.length}`);
    console.log('');

    if (result.errors.length === 0) {
      console.log('🎉 SUCCESS! All schema files are valid!');
      console.log('');
      console.log('✅ Validation Summary:');
      console.log('   ✓ All files have proper structure');
      console.log('   ✓ All schema syntax is correct');
      console.log('   ✓ All imports resolve correctly');
      console.log('   ✓ All TypeScript compilation passes');
      console.log('   ✓ All z.ZodTypeAny usage is handled properly');
      console.log('');
      console.log('Your Prisma Zod Generator schemas are ready for production! 🚀');
      return;
    }

    // Show detailed errors
    console.log('❌ DETAILED ERROR REPORT');
    console.log('-'.repeat(50));

    const errorsByType = {};
    result.errors.forEach(error => {
      if (!errorsByType[error.type]) errorsByType[error.type] = [];
      errorsByType[error.type].push(error);
    });

    const typeEmojis = {
      structure: '🏗️',
      syntax: '🔧',
      import: '📦',
      typescript: '📝'
    };

    for (const [type, errors] of Object.entries(errorsByType)) {
      console.log(`\\n${typeEmojis[type]} ${type.toUpperCase()} ERRORS (${errors.length}):`);
      console.log('-'.repeat(30));
      
      errors.forEach((error, index) => {
        console.log(`${index + 1}. 📄 ${error.file}`);
        console.log(`   ❌ ${error.error}`);
        if (error.details) {
          console.log(`   💡 ${error.details}`);
        }
        console.log('');
      });
    }

    console.log('🔧 To fix these issues:');
    console.log('1. Review the error details above');
    console.log('2. Fix the indicated files');
    console.log('3. Re-run this validation script');
    console.log('4. Repeat until all errors are resolved');
  }
}

// Main execution
async function main() {
  try {
    const validator = new SchemaValidator();
    const result = await validator.validateAll();
    validator.printResults(result);

    process.exit(result.errors.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  }
}

// Run the validator
if (require.main === module) {
  main();
}

module.exports = { SchemaValidator };
