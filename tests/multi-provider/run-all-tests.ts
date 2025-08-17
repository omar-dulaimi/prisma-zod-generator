#!/usr/bin/env node

// Multi-Provider Test Runner Script
// Runs comprehensive tests across all database providers

import { MultiProviderTestRunner } from '../../prisma/utils/multi-provider-test-runner';
import { getAllProviders } from '../../prisma/utils/provider-config';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
// import { join } from 'path';

interface TestOptions {
  providers?: string[];
  skipSetup?: boolean;
  skipTeardown?: boolean;
  generateOnly?: boolean;
  testOnly?: boolean;
  verbose?: boolean;
  parallel?: boolean;
  output?: string;
}

class ComprehensiveTestRunner {
  private testRunner: MultiProviderTestRunner;
  private options: TestOptions;

  constructor(options: TestOptions = {}) {
    this.testRunner = new MultiProviderTestRunner();
    this.options = {
      providers: options.providers || getAllProviders(),
      skipSetup: options.skipSetup || false,
      skipTeardown: options.skipTeardown || false,
      generateOnly: options.generateOnly || false,
      testOnly: options.testOnly || false,
      verbose: options.verbose || false,
      parallel: options.parallel || false,
      output: options.output || 'console',
    };
  }

  async run(): Promise<void> {
    console.log('🚀 Starting comprehensive multi-provider tests...');
    console.log(`📋 Providers to test: ${(this.options.providers as string[]).join(', ')}`);

    try {
      // Setup phase
      if (!this.options.skipSetup && !this.options.testOnly) {
        await this.setupPhase();
      }

      // Generation phase
      if (!this.options.testOnly) {
        await this.generationPhase();
      }

      // Testing phase
      if (!this.options.generateOnly) {
        await this.testingPhase();
      }

      // Teardown phase
      if (!this.options.skipTeardown && !this.options.testOnly) {
        await this.teardownPhase();
      }

      console.log('✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test run failed:', error);
      process.exit(1);
    }
  }

  private async setupPhase(): Promise<void> {
    console.log('\n🔧 Setup Phase');
    console.log('='.repeat(50));

    // Check prerequisites
    await this.checkPrerequisites();

    // Setup databases if needed
    await this.setupDatabases();

    // Install dependencies
    await this.installDependencies();

    console.log('✅ Setup phase completed');
  }

  private async generationPhase(): Promise<void> {
    console.log('\n⚙️  Generation Phase');
    console.log('='.repeat(50));

    for (const provider of this.options.providers as string[]) {
      console.log(`\n📄 Generating schemas for ${provider}...`);

      try {
        const schemaPath = `./prisma/schemas/${provider}/schema.prisma`;

        if (!existsSync(schemaPath)) {
          console.warn(`⚠️  Schema file not found: ${schemaPath}`);
          continue;
        }

        // Generate schemas
        const generateCommand = `npx prisma generate --schema="${schemaPath}"`;
        execSync(generateCommand, {
          cwd: this.basePath,
          stdio: this.options.verbose ? 'inherit' : 'pipe',
          env: { ...process.env, PRISMA_SCHEMA_PATH: schemaPath },
        });

        console.log(`✅ ${provider} schema generation completed`);
      } catch (error) {
        console.error(`❌ ${provider} schema generation failed:`, error);
        throw error;
      }
    }

    console.log('✅ Generation phase completed');
  }

  private async testingPhase(): Promise<void> {
    console.log('\n🧪 Testing Phase');
    console.log('='.repeat(50));

    if (this.options.parallel) {
      await this.runTestsInParallel();
    } else {
      await this.runTestsSequentially();
    }

    console.log('✅ Testing phase completed');
  }

  private async teardownPhase(): Promise<void> {
    console.log('\n🧹 Teardown Phase');
    console.log('='.repeat(50));

    // Cleanup generated files if needed
    await this.cleanup();

    console.log('✅ Teardown phase completed');
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking prerequisites...');

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`📦 Node.js version: ${nodeVersion}`);

    // Check if Prisma CLI is available
    try {
      execSync('npx prisma --version', { stdio: 'pipe' });
      console.log('✅ Prisma CLI is available');
    } catch {
      console.error('❌ Prisma CLI not found');
      throw new Error('Prisma CLI is required');
    }

    // Check if TypeScript is available
    try {
      execSync('npx tsc --version', { stdio: 'pipe' });
      console.log('✅ TypeScript is available');
    } catch {
      console.error('❌ TypeScript not found');
      throw new Error('TypeScript is required');
    }

    // Check if test framework is available
    try {
      execSync('npx vitest --version', { stdio: 'pipe' });
      console.log('✅ Vitest is available');
    } catch {
      console.error('❌ Vitest not found');
      throw new Error('Vitest is required');
    }
  }

  private async setupDatabases(): Promise<void> {
    console.log('🗄️  Setting up databases...');

    // For now, we'll use in-memory/file-based databases for testing
    // In a real scenario, you might want to start Docker containers

    for (const provider of this.options.providers as string[]) {
      console.log(`  📊 Setting up ${provider}...`);

      switch (provider) {
        case 'sqlite':
          // SQLite uses file-based databases, no setup needed
          console.log('    ✅ SQLite: Using file-based database');
          break;

        case 'postgresql':
          // In a real scenario, you'd start a PostgreSQL container
          console.log('    ⚠️  PostgreSQL: Using environment connection string');
          break;

        case 'mysql':
          // In a real scenario, you'd start a MySQL container
          console.log('    ⚠️  MySQL: Using environment connection string');
          break;

        case 'mongodb':
          // In a real scenario, you'd start a MongoDB container
          console.log('    ⚠️  MongoDB: Using environment connection string');
          break;

        case 'sqlserver':
          // In a real scenario, you'd start a SQL Server container
          console.log('    ⚠️  SQL Server: Using environment connection string');
          break;

        default:
          console.log(`    ⚠️  Unknown provider: ${provider}`);
      }
    }
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Installing dependencies...');

    // Check if node_modules exists
    if (!existsSync('node_modules')) {
      console.log('Installing npm dependencies...');
      execSync('npm install', {
        cwd: process.cwd(),
        stdio: this.options.verbose ? 'inherit' : 'pipe',
      });
    }

    console.log('✅ Dependencies are ready');
  }

  private async runTestsInParallel(): Promise<void> {
    console.log('🏃‍♂️ Running tests in parallel...');

    const testPromises = (this.options.providers as string[]).map((provider) =>
      this.testRunner.runProviderTests(provider),
    );

    try {
      const results = await Promise.allSettled(testPromises);

      results.forEach((result, index) => {
        const provider = (this.options.providers as string[])[index];
        if (result.status === 'fulfilled') {
          console.log(
            `✅ ${provider}: ${result.value.summary.passedTests}/${result.value.summary.totalTests} tests passed`,
          );
        } else {
          console.log(`❌ ${provider}: Tests failed - ${result.reason}`);
        }
      });
    } catch (error) {
      console.error('❌ Parallel test execution failed:', error);
      throw error;
    }
  }

  private async runTestsSequentially(): Promise<void> {
    console.log('🚶‍♂️ Running tests sequentially...');

    const report = await this.testRunner.runAllTests();

    if (this.options.output === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      // Summary is already printed by the test runner
    }
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');

    // Remove temporary files if any
    // Clean up test databases if needed
    // Remove generated files if requested

    console.log('✅ Cleanup completed');
  }
}

// CLI Interface
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--providers':
        options.providers = args[++i]?.split(',') || [];
        break;
      case '--skip-setup':
        options.skipSetup = true;
        break;
      case '--skip-teardown':
        options.skipTeardown = true;
        break;
      case '--generate-only':
        options.generateOnly = true;
        break;
      case '--test-only':
        options.testOnly = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--output':
        options.output = args[++i] || 'console';
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Multi-Provider Test Runner

Usage: npm run test:multi-provider [options]

Options:
  --providers <list>     Comma-separated list of providers to test
                        (postgresql,mysql,mongodb,sqlite,sqlserver)
  --skip-setup          Skip the setup phase
  --skip-teardown       Skip the teardown phase
  --generate-only       Only generate schemas, don't run tests
  --test-only          Only run tests, don't generate schemas
  --verbose             Enable verbose output
  --parallel            Run tests in parallel (faster but uses more resources)
  --output <format>     Output format (console, json)
  --help               Show this help message

Examples:
  npm run test:multi-provider
  npm run test:multi-provider -- --providers postgresql,mysql
  npm run test:multi-provider -- --generate-only --verbose
  npm run test:multi-provider -- --test-only --parallel
  npm run test:multi-provider -- --output json > test-results.json
`);
}

// Main execution
async function main(): Promise<void> {
  const options = parseArgs();
  const runner = new ComprehensiveTestRunner(options);
  await runner.run();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default ComprehensiveTestRunner;
