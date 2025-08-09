// Multi-Provider Test Runner
// Orchestrates testing across all database providers

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  getAllProviders,
  getProviderConfig,
  ProviderConfig,
  TestCase,
  ValidationRule
} from './provider-config';

export interface TestResult {
  provider: string;
  testCase: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errors: string[];
  warnings: string[];
  generatedSchemas: string[];
}

export interface TestSuite {
  name: string;
  description: string;
  results: TestResult[];
  summary: TestSummary;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  coverage: number;
}

export interface TestReport {
  timestamp: string;
  version: string;
  providers: string[];
  testSuites: TestSuite[];
  overallSummary: TestSummary;
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  generationTime: Record<string, number>;
  schemaValidationTime: Record<string, number>;
  memoryUsage: Record<string, number>;
  fileSize: Record<string, number>;
}

export class MultiProviderTestRunner {
  private results: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics = {
    generationTime: {},
    schemaValidationTime: {},
    memoryUsage: {},
    fileSize: {}
  };
  private schemaCache = new Map<string, { generated: boolean; timestamp: number }>();

  constructor(private basePath: string = process.cwd()) {}

  /**
   * Run tests for all providers with optional parallel execution
   */
  async runAllTests(parallel: boolean = false): Promise<TestReport> {
    console.log('🚀 Starting multi-provider test suite...');
    
    const providers = getAllProviders();
    let testSuites: TestSuite[] = [];

    if (parallel && providers.length > 1) {
      console.log(`📊 Running ${providers.length} providers in parallel...`);
      
      // Pre-generate all schemas in parallel to avoid conflicts
      await this.preGenerateAllSchemas(providers);
      
      // Run tests in parallel
      const testPromises = providers.map(provider => 
        this.runProviderTests(provider).catch(error => {
          console.error(`Failed to test provider ${provider}:`, error);
          return this.createFailedTestSuite(provider, error);
        })
      );
      
      testSuites = await Promise.all(testPromises);
    } else {
      // Sequential execution (original behavior)
      for (const provider of providers) {
        console.log(`\n📋 Testing provider: ${provider}`);
        const testSuite = await this.runProviderTests(provider);
        testSuites.push(testSuite);
      }
    }

    const overallSummary = this.calculateOverallSummary(testSuites);
    
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      version: this.getGeneratorVersion(),
      providers: providers,
      testSuites: testSuites,
      overallSummary: overallSummary,
      performanceMetrics: this.performanceMetrics
    };

    this.saveReport(report);
    this.printSummary(report);
    
    return report;
  }

  /**
   * Run tests for a specific provider
   */
  async runProviderTests(providerName: string): Promise<TestSuite> {
    const config = getProviderConfig(providerName);
    if (!config) {
      throw new Error(`Provider configuration not found: ${providerName}`);
    }

    const testSuite: TestSuite = {
      name: providerName,
      description: `Test suite for ${config.name}`,
      results: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        totalDuration: 0,
        coverage: 0
      }
    };

    try {
      // Generate schemas for this provider
      await this.generateSchemas(config);
      
      // Run core tests
      await this.runCoreTests(config, testSuite);
      
      // Run provider-specific tests
      await this.runProviderSpecificTests(config, testSuite);
      
      // Run performance tests
      await this.runPerformanceTests(config, testSuite);
      
      // Calculate summary
      testSuite.summary = this.calculateSummary(testSuite.results);
      
    } catch (error) {
      console.error(`❌ Error testing provider ${providerName}:`, error);
      testSuite.results.push({
        provider: providerName,
        testCase: 'Provider Setup',
        status: 'failed',
        duration: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        generatedSchemas: []
      });
    }

    return testSuite;
  }

  /**
   * Generate Zod schemas for a provider with caching
   */
  private async generateSchemas(config: ProviderConfig): Promise<void> {
    const schemaPath = join(this.basePath, config.schemaPath);
    const generatedPath = join(this.basePath, config.generatedPath);
    
    if (!existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    // Check if schemas are already generated and up-to-date
    const cacheKey = config.provider;
    const cached = this.schemaCache.get(cacheKey);
    const schemaModTime = this.getFileModTime(schemaPath);
    
    if (cached && cached.generated && existsSync(generatedPath) && cached.timestamp >= schemaModTime) {
      console.log(`  ♻️  Using cached schemas for ${config.name} (${cached.timestamp - schemaModTime}ms newer)`);
      this.performanceMetrics.generationTime[config.provider] = 0; // Cached
      return;
    }

    console.log(`  📄 Generating schemas for ${config.name}...`);
    const startTime = Date.now();
    
    try {
      // Run Prisma generate with quoted schema path to handle spaces
      const generateCommand = `npx prisma generate --schema="${schemaPath}"`;
      execSync(generateCommand, { 
        cwd: this.basePath,
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      this.performanceMetrics.generationTime[config.provider] = duration;
      
      // Update cache
      this.schemaCache.set(cacheKey, { 
        generated: true, 
        timestamp: Date.now() 
      });
      
      console.log(`  ✅ Schema generation completed in ${duration}ms`);
      
    } catch (error) {
      console.error(`  ❌ Schema generation failed:`, error);
      throw error;
    }
  }

  /**
   * Run core tests (common to all providers)
   */
  private async runCoreTests(config: ProviderConfig, testSuite: TestSuite): Promise<void> {
    console.log(`  🧪 Running core tests for ${config.name}...`);
    
    const coreTests = [
      'Basic Types',
      'CRUD Operations',
      'Aggregations',
      'Relationships',
      'Enums',
      'Optional Fields',
      'Null Handling'
    ];

    for (const testName of coreTests) {
      const result = await this.runCoreTest(config, testName);
      testSuite.results.push(result);
    }
  }

  /**
   * Run provider-specific tests
   */
  private async runProviderSpecificTests(config: ProviderConfig, testSuite: TestSuite): Promise<void> {
    console.log(`  🔬 Running provider-specific tests for ${config.name}...`);
    
    for (const category of config.testCategories) {
      for (const testCase of category.testCases) {
        const result = await this.runProviderSpecificTest(config, testCase);
        testSuite.results.push(result);
      }
    }
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(config: ProviderConfig, testSuite: TestSuite): Promise<void> {
    console.log(`  ⚡ Running performance tests for ${config.name}...`);
    
    const performanceTests = [
      'Schema Validation Speed',
      'Memory Usage',
      'File Size',
      'Load Time'
    ];

    for (const testName of performanceTests) {
      const result = await this.runPerformanceTest(config, testName);
      testSuite.results.push(result);
    }
  }

  /**
   * Run a single core test
   */
  private async runCoreTest(config: ProviderConfig, testName: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if required schemas exist
      const generatedPath = join(this.basePath, config.generatedPath);
      const schemas = this.getGeneratedSchemas(generatedPath);
      
      if (schemas.length === 0) {
        return {
          provider: config.provider,
          testCase: testName,
          status: 'failed',
          duration: Date.now() - startTime,
          errors: ['No schemas generated'],
          warnings: [],
          generatedSchemas: []
        };
      }

      // Run specific test logic based on testName
      const testPassed = await this.validateCoreTest(config, testName, schemas);
      
      return {
        provider: config.provider,
        testCase: testName,
        status: testPassed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        errors: testPassed ? [] : [`${testName} validation failed`],
        warnings: [],
        generatedSchemas: schemas
      };
      
    } catch (error) {
      return {
        provider: config.provider,
        testCase: testName,
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        generatedSchemas: []
      };
    }
  }

  /**
   * Run a single provider-specific test
   */
  private async runProviderSpecificTest(config: ProviderConfig, testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const generatedPath = join(this.basePath, config.generatedPath);
      const schemas = this.getGeneratedSchemas(generatedPath);
      
      // Validate test case
      const validationResults = await this.validateTestCase(config, testCase, schemas);
      const allPassed = validationResults.every(result => result.passed);
      
      return {
        provider: config.provider,
        testCase: testCase.name,
        status: allPassed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        errors: validationResults.filter(r => !r.passed).map(r => r.error || 'Validation failed'),
        warnings: validationResults.filter(r => r.warning).map(r => r.warning!),
        generatedSchemas: testCase.expectedSchemas
      };
      
    } catch (error) {
      return {
        provider: config.provider,
        testCase: testCase.name,
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        generatedSchemas: []
      };
    }
  }

  /**
   * Run a single performance test
   */
  private async runPerformanceTest(config: ProviderConfig, testName: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      let performanceResult: any;
      
      switch (testName) {
        case 'Schema Validation Speed':
          performanceResult = await this.measureValidationSpeed(config);
          break;
        case 'Memory Usage':
          performanceResult = await this.measureMemoryUsage(config);
          break;
        case 'File Size':
          performanceResult = await this.measureFileSize(config);
          break;
        case 'Load Time':
          performanceResult = await this.measureLoadTime(config);
          break;
        default:
          throw new Error(`Unknown performance test: ${testName}`);
      }
      
      return {
        provider: config.provider,
        testCase: testName,
        status: 'passed',
        duration: Date.now() - startTime,
        errors: [],
        warnings: [],
        generatedSchemas: []
      };
      
    } catch (error) {
      return {
        provider: config.provider,
        testCase: testName,
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        generatedSchemas: []
      };
    }
  }

  /**
   * Validate a core test
   */
  private async validateCoreTest(config: ProviderConfig, testName: string, schemas: string[]): Promise<boolean> {
    // Basic validation logic
    switch (testName) {
      case 'Basic Types':
        return schemas.some(schema => schema.includes('z.string()') && schema.includes('z.number()'));
      case 'CRUD Operations':
        return schemas.some(schema => schema.includes('create') || schema.includes('findMany'));
      case 'Aggregations':
  // Match aggregate-related schemas/results regardless of casing
  return schemas.some(schema => /aggregate/i.test(schema));
      case 'Relationships':
        return schemas.some(schema => schema.includes('include') || schema.includes('select'));
      case 'Enums':
        return schemas.some(schema => schema.includes('z.enum'));
      case 'Optional Fields':
        return schemas.some(schema => schema.includes('optional()'));
      case 'Null Handling':
        return schemas.some(schema => schema.includes('nullable()'));
      default:
        return true;
    }
  }

  /**
   * Validate a test case
   */
  private async validateTestCase(config: ProviderConfig, testCase: TestCase, schemas: string[]): Promise<Array<{passed: boolean, error?: string, warning?: string}>> {
    const results: Array<{passed: boolean, error?: string, warning?: string}> = [];
    
    for (const rule of testCase.validationRules) {
      try {
        const passed = await this.validateRule(rule, schemas);
        results.push({ passed });
      } catch (error) {
        results.push({ 
          passed: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    return results;
  }

  /**
   * Validate a single rule
   */
  private async validateRule(rule: ValidationRule, schemas: string[]): Promise<boolean> {
    // Simple validation logic - can be extended
    const schemaContent = schemas.join('\n');
    
    switch (rule.rule) {
      case 'string':
        return schemaContent.includes('z.string()');
      case 'number':
        return schemaContent.includes('z.number()');
      case 'int':
        return schemaContent.includes('z.number().int()');
      case 'array':
        return schemaContent.includes('z.array(');
      case 'object':
        return schemaContent.includes('z.object(');
      case 'optional':
        return schemaContent.includes('.optional()');
      case 'nullable':
        return schemaContent.includes('.nullable()');
      default:
        return true;
    }
  }

  /**
   * Get generated schemas from a directory
   */
  private getGeneratedSchemas(generatedPath: string): string[] {
    const schemas: string[] = [];
    
    try {
      if (!existsSync(generatedPath)) {
        return schemas;
      }
      
      // Read all .ts files in the generated directory
      const files = this.getAllFiles(generatedPath, '.ts');
      
      for (const file of files) {
        const content = readFileSync(file, 'utf8');
        schemas.push(content);
      }
      
    } catch (error) {
      console.warn(`Warning: Could not read schemas from ${generatedPath}:`, error);
    }
    
    return schemas;
  }

  /**
   * Get all files with a specific extension recursively
   */
  private getAllFiles(dir: string, ext: string): string[] {
    // Simple implementation - can be enhanced
    const files: string[] = [];
    
    try {
      const { readdirSync, statSync } = require('fs');
      const items = readdirSync(dir);
      
      for (const item of items) {
        const itemPath = join(dir, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          files.push(...this.getAllFiles(itemPath, ext));
        } else if (item.endsWith(ext)) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Performance measurement methods
   */
  private async measureValidationSpeed(config: ProviderConfig): Promise<number> {
    const startTime = Date.now();
    
    // Simulate schema validation
    const schemas = this.getGeneratedSchemas(join(this.basePath, config.generatedPath));
    
    // Simple validation speed test
    for (let i = 0; i < 100; i++) {
      schemas.forEach(schema => {
        // Simulate validation
        schema.includes('z.string()');
      });
    }
    
    const duration = Date.now() - startTime;
    this.performanceMetrics.schemaValidationTime[config.provider] = duration;
    
    return duration;
  }

  private async measureMemoryUsage(config: ProviderConfig): Promise<number> {
    const used = process.memoryUsage();
    const memoryUsage = used.heapUsed / 1024 / 1024; // Convert to MB
    
    this.performanceMetrics.memoryUsage[config.provider] = memoryUsage;
    
    return memoryUsage;
  }

  private async measureFileSize(config: ProviderConfig): Promise<number> {
    const generatedPath = join(this.basePath, config.generatedPath);
    const files = this.getAllFiles(generatedPath, '.ts');
    
    let totalSize = 0;
    for (const file of files) {
      try {
        const { statSync } = require('fs');
        const stat = statSync(file);
        totalSize += stat.size;
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }
    
    this.performanceMetrics.fileSize[config.provider] = totalSize;
    
    return totalSize;
  }

  private async measureLoadTime(config: ProviderConfig): Promise<number> {
    const startTime = Date.now();
    
    // Simulate loading generated schemas
    const schemas = this.getGeneratedSchemas(join(this.basePath, config.generatedPath));
    
    const duration = Date.now() - startTime;
    
    return duration;
  }

  /**
   * Calculate summary for a test suite
   */
  private calculateSummary(results: TestResult[]): TestSummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const skippedTests = results.filter(r => r.status === 'skipped').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const coverage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalDuration,
      coverage
    };
  }

  /**
   * Calculate overall summary
   */
  private calculateOverallSummary(testSuites: TestSuite[]): TestSummary {
    const allResults = testSuites.flatMap(suite => suite.results);
    return this.calculateSummary(allResults);
  }

  /**
   * Get generator version
   */
  private getGeneratorVersion(): string {
    try {
      const packagePath = join(this.basePath, 'package.json');
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageContent.version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  }

  /**
   * Save test report
   */
  private saveReport(report: TestReport): void {
    const reportPath = join(this.basePath, 'test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Test report saved to: ${reportPath}`);
  }

  /**
   * Print test summary
   */
  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 MULTI-PROVIDER TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📅 Timestamp: ${report.timestamp}`);
    console.log(`📦 Version: ${report.version}`);
    console.log(`🗄️  Providers: ${report.providers.join(', ')}`);
    
    console.log('\n📊 Overall Results:');
    console.log(`  Total Tests: ${report.overallSummary.totalTests}`);
    console.log(`  ✅ Passed: ${report.overallSummary.passedTests}`);
    console.log(`  ❌ Failed: ${report.overallSummary.failedTests}`);
    console.log(`  ⏭️  Skipped: ${report.overallSummary.skippedTests}`);
    console.log(`  📈 Coverage: ${report.overallSummary.coverage.toFixed(2)}%`);
    console.log(`  ⏱️  Duration: ${report.overallSummary.totalDuration}ms`);
    
    console.log('\n🏷️  Provider Results:');
    for (const suite of report.testSuites) {
      const status = suite.summary.failedTests === 0 ? '✅' : '❌';
      console.log(`  ${status} ${suite.name}: ${suite.summary.passedTests}/${suite.summary.totalTests} (${suite.summary.coverage.toFixed(1)}%)`);
    }
    
    console.log('\n⚡ Performance Metrics:');
    console.log('  Generation Time:');
    Object.entries(report.performanceMetrics.generationTime).forEach(([provider, time]) => {
      console.log(`    ${provider}: ${time}ms`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (report.overallSummary.failedTests > 0) {
      console.log('❌ Some tests failed. Check the detailed report for more information.');
      // Note: Not calling process.exit in test environment
      if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        process.exit(1);
      }
    } else {
      console.log('✅ All tests passed successfully!');
    }
  }

  /**
   * Pre-generate schemas for all providers in parallel
   */
  private async preGenerateAllSchemas(providers: string[]): Promise<void> {
    console.log('🔄 Pre-generating all schemas in parallel...');
    
    const generatePromises = providers.map(async (provider) => {
      const config = getProviderConfig(provider);
      if (config) {
        try {
          await this.generateSchemas(config);
        } catch (error) {
          console.warn(`⚠️ Failed to pre-generate schemas for ${provider}:`, error);
        }
      }
    });
    
    await Promise.all(generatePromises);
    console.log('✅ All schemas pre-generated');
  }

  /**
   * Create a failed test suite for error handling
   */
  private createFailedTestSuite(providerName: string, error: any): TestSuite {
    return {
      name: providerName,
      description: `Failed test suite for ${providerName}`,
      results: [{
        provider: providerName,
        testCase: 'Provider Setup',
        status: 'failed',
        duration: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        generatedSchemas: []
      }],
      summary: {
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        totalDuration: 0,
        coverage: 0
      }
    };
  }

  /**
   * Get file modification time safely
   */
  private getFileModTime(filePath: string): number {
    try {
      return statSync(filePath).mtime.getTime();
    } catch {
      return 0;
    }
  }
}

// Export for use in scripts
export default MultiProviderTestRunner;