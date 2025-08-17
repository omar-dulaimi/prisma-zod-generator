#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

interface TestResult {
  success: boolean;
  duration: number;
  errors: string[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestSuite {
  name: string;
  path: string;
  schemas: string[];
}

class AutomatedTestRunner {
  private schemasPath: string;
  private testResults: Map<string, TestResult> = new Map();

  constructor(schemasPath: string = './prisma/generated/schemas') {
    this.schemasPath = schemasPath;
  }

  /**
   * Run all tests with TypeScript compilation and validation
   */
  async runFullTestSuite(): Promise<void> {
    console.log('🚀 Starting automated test suite...\n');

    const startTime = performance.now();

    try {
      // Step 1: TypeScript compilation check
      await this.runTypeScriptCheck();

      // Step 2: Discover test suites
      const testSuites = this.discoverTestSuites();

      // Step 3: Run Vitest tests
      await this.runVitestTests();

      // Step 4: Run schema validation tests
      await this.runSchemaValidationTests(testSuites);

      // Step 5: Generate report
      this.generateReport(performance.now() - startTime);
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run TypeScript compilation check
   */
  private async runTypeScriptCheck(): Promise<void> {
    console.log('🔍 Running TypeScript compilation check...');

    try {
      execSync('npm run test:type-check', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      console.log('✅ TypeScript compilation check passed\n');
    } catch (error) {
      console.error('❌ TypeScript compilation failed');
      throw error;
    }
  }

  /**
   * Discover all test suites and their associated schemas
   */
  private discoverTestSuites(): TestSuite[] {
    const testSuites: TestSuite[] = [];

    if (!existsSync(this.schemasPath)) {
      console.warn(`⚠️  Schema path ${this.schemasPath} not found`);
      return testSuites;
    }

    const schemas = this.getAllSchemaFiles(this.schemasPath);

    // Group schemas by type
    const operations = schemas.filter(
      (s) =>
        s.includes('find') || s.includes('create') || s.includes('update') || s.includes('delete'),
    );
    const enums = schemas.filter((s) => s.includes('enums/'));
    const objects = schemas.filter((s) => s.includes('objects/'));

    testSuites.push(
      { name: 'Operations', path: this.schemasPath, schemas: operations },
      { name: 'Enums', path: join(this.schemasPath, 'enums'), schemas: enums },
      {
        name: 'Objects',
        path: join(this.schemasPath, 'objects'),
        schemas: objects,
      },
    );

    console.log(
      `📊 Discovered ${schemas.length} schema files across ${testSuites.length} test suites`,
    );
    return testSuites;
  }

  /**
   * Get all schema files recursively
   */
  private getAllSchemaFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getAllSchemaFiles(fullPath).map((f) => join(item, f)));
      } else if (item.endsWith('.schema.ts')) {
        files.push(item);
      }
    }

    return files;
  }

  /**
   * Run Vitest tests
   */
  private async runVitestTests(): Promise<void> {
    console.log('🧪 Running Vitest tests...');

    try {
      execSync('npm run test:ci', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      console.log('✅ Vitest tests passed\n');
    } catch (error) {
      console.error('❌ Vitest tests failed');
      throw error;
    }
  }

  /**
   * Run schema validation tests
   */
  private async runSchemaValidationTests(testSuites: TestSuite[]): Promise<void> {
    console.log('🔬 Running schema validation tests...');

    for (const suite of testSuites) {
      const startTime = performance.now();
      const errors: string[] = [];

      try {
        for (const schema of suite.schemas) {
          await this.validateSchema(join(suite.path, schema));
        }

        this.testResults.set(suite.name, {
          success: true,
          duration: performance.now() - startTime,
          errors,
        });

        console.log(`✅ ${suite.name} validation passed (${suite.schemas.length} schemas)`);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        this.testResults.set(suite.name, {
          success: false,
          duration: performance.now() - startTime,
          errors,
        });

        console.error(`❌ ${suite.name} validation failed:`, error);
      }
    }
  }

  /**
   * Validate individual schema file
   */
  private async validateSchema(schemaPath: string): Promise<void> {
    if (!existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    try {
      // Dynamic import to validate schema can be loaded
      const schema = await import(schemaPath);

      // Check if schema exports are valid Zod schemas
      for (const [key, value] of Object.entries(schema)) {
        if (value && typeof value === 'object' && 'safeParse' in value) {
          // Test basic validation
          const result = (value as z.ZodTypeAny).safeParse({});
          // Schema should either pass or fail gracefully
          if (result === undefined) {
            throw new Error(`Schema ${key} in ${schemaPath} returned undefined`);
          }
        }
      }
    } catch (error) {
      throw new Error(`Schema validation failed for ${schemaPath}: ${error}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(totalDuration: number): void {
    console.log('\n📋 Test Report Summary');
    console.log('='.repeat(50));

    const totalTests = this.testResults.size;
    const passedTests = Array.from(this.testResults.values()).filter((r) => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log();

    // Detailed results
    for (const [suiteName, result] of this.testResults) {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);

      console.log(`${status} ${suiteName}: ${duration}s`);

      if (!result.success && result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`   └─ ${error}`);
        }
      }
    }

    console.log();

    if (failedTests > 0) {
      console.error(`❌ ${failedTests} test suite(s) failed`);
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
    }
  }

  /**
   * Run specific test by name pattern
   */
  async runSpecificTest(pattern: string): Promise<void> {
    console.log(`🎯 Running specific test: ${pattern}`);

    try {
      execSync(`npm run test:specific "${pattern}"`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      console.log(`✅ Test "${pattern}" passed`);
    } catch (error) {
      console.error(`❌ Test "${pattern}" failed`);
      throw error;
    }
  }

  /**
   * Run performance benchmark
   */
  async runPerformanceBenchmark(): Promise<void> {
    console.log('⚡ Running performance benchmark...');

    try {
      execSync('npm run test:specific "Performance"', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
      console.log('✅ Performance benchmark completed');
    } catch (error) {
      console.error('❌ Performance benchmark failed');
      throw error;
    }
  }
}

// CLI Interface
if (require.main === module) {
  const runner = new AutomatedTestRunner();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    runner.runFullTestSuite().catch(console.error);
  } else {
    const command = args[0];

    switch (command) {
      case 'specific':
        if (args[1]) {
          runner.runSpecificTest(args[1]).catch(console.error);
        } else {
          console.error('Please provide a test pattern');
          process.exit(1);
        }
        break;

      case 'performance':
        runner.runPerformanceBenchmark().catch(console.error);
        break;

      case 'full':
        runner.runFullTestSuite().catch(console.error);
        break;

      default:
        console.error('Unknown command. Use: full, specific <pattern>, or performance');
        process.exit(1);
    }
  }
}

export { AutomatedTestRunner };
