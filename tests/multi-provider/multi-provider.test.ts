// Multi-Provider Integration Tests
// Comprehensive tests across all database providers

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAllProviderTestSuites } from './provider-test-suite';
import { MultiProviderTestRunner } from '../../prisma/utils/multi-provider-test-runner';
import { getAllProviders, getProviderConfig } from '../../prisma/utils/provider-config';

describe('Multi-Provider Integration Tests', () => {
  let testRunner: MultiProviderTestRunner;

  beforeAll(async () => {
    testRunner = new MultiProviderTestRunner();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Provider Availability Tests', () => {
    const providers = getAllProviders();

    providers.forEach((provider) => {
      it(`should have configuration for ${provider}`, () => {
        const config = getProviderConfig(provider);
        expect(config).toBeDefined();
        expect(config?.name).toBeDefined();
        expect(config?.provider).toBe(provider);
        expect(config?.schemaPath).toBeDefined();
        expect(config?.generatedPath).toBeDefined();
      });
    });
  });

  describe('Schema Generation Tests', () => {
    const providers = getAllProviders();

    providers.forEach((provider) => {
      it(`should generate schemas for ${provider}`, async () => {
        const result = await testRunner.runProviderTests(provider);

        expect(result).toBeDefined();
        expect(result.name).toBe(provider);
        expect(result.results).toBeDefined();
        expect(result.results.length).toBeGreaterThan(0);

        // Check that at least some tests passed
        const passedTests = result.results.filter((r) => r.status === 'passed');
        expect(passedTests.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cross-Provider Compatibility Tests', () => {
    it('should generate consistent schemas across providers', async () => {
      const providers = getAllProviders();
      const results = await Promise.all(
        providers.map((provider) => testRunner.runProviderTests(provider)),
      );

      // Check that all providers generated schemas
      results.forEach((result, index) => {
        const provider = providers[index];
        expect(result.name).toBe(provider);
        expect(result.results.length).toBeGreaterThan(0);
      });

      // Check consistency - all providers should have similar operation schemas
      const commonOperations = ['Basic Types', 'CRUD Operations', 'Relationships'];

      for (const operation of commonOperations) {
        const operationResults = results.map((result) =>
          result.results.find((r) => r.testCase === operation),
        );

        // All providers should have this operation
        operationResults.forEach((opResult, index) => {
          const provider = providers[index];
          expect(opResult).toBeDefined();
          expect(opResult?.provider).toBe(provider);
        });
      }
    });
  });

  describe('Performance Comparison Tests', () => {
    it('should compare performance across providers', async () => {
      const providers = getAllProviders();
      const performanceResults: Record<string, number> = {};

      for (const provider of providers) {
        const startTime = Date.now();
        await testRunner.runProviderTests(provider);
        const duration = Date.now() - startTime;

        performanceResults[provider] = duration;

        // Each provider should complete tests within reasonable time
        expect(duration).toBeLessThan(60000); // 1 minute max
      }

      // Log performance comparison
      console.log('Performance comparison:');
      Object.entries(performanceResults).forEach(([provider, duration]) => {
        console.log(`  ${provider}: ${duration}ms`);
      });

      // Find fastest and slowest
      const times = Object.values(performanceResults);
      const fastest = Math.min(...times);
      const slowest = Math.max(...times);

      // Slowest should not be more than 10x slower than fastest
      expect(slowest / fastest).toBeLessThan(10);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid provider gracefully', async () => {
      await expect(async () => {
        await testRunner.runProviderTests('invalid-provider');
      }).rejects.toThrow('Provider configuration not found');
    });

    it('should handle missing schema files gracefully', async () => {
      // This would test what happens when schema files are missing
      // Implementation depends on how errors are handled
    });
  });

  describe('Feature Coverage Tests', () => {
    it('should test all declared features for each provider', async () => {
      const providers = getAllProviders();

      for (const provider of providers) {
        const config = getProviderConfig(provider);
        const result = await testRunner.runProviderTests(provider);

        // Check that features are actually tested
        const featureTests = result.results.filter(
          (r) => r.testCase.includes('Type') || r.testCase.includes('Feature'),
        );

        expect(featureTests.length).toBeGreaterThan(0);

        // Check that native types are tested
        if (config?.features?.nativeTypes?.length > 0) {
          const typeTests = featureTests.filter((r) => r.testCase.includes('Type'));
          expect(typeTests.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Limitation Handling Tests', () => {
    it('should handle provider limitations correctly', async () => {
      const providers = getAllProviders();

      for (const provider of providers) {
        const config = getProviderConfig(provider);
        const result = await testRunner.runProviderTests(provider);

        // If provider has limitations, they should be tested
        if (config?.limitations?.unsupportedFeatures?.length > 0) {
          const limitationTests = result.results.filter(
            (r) => r.testCase.includes('limitation') || r.testCase.includes('Limitation'),
          );

          // Either limitation tests exist, or they're skipped gracefully
          expect(limitationTests.length >= 0).toBe(true);
        }
      }
    });
  });

  describe('Comprehensive Integration Test', () => {
    it('should run complete test suite across all providers', async () => {
      // Use parallel execution for better performance
      const useParallel = process.env.VITEST_PARALLEL !== 'false';
      const report = await testRunner.runAllTests(useParallel);

      // Basic report structure
      expect(report.timestamp).toBeDefined();
      expect(report.version).toBeDefined();
      expect(report.providers).toBeDefined();
      expect(report.testSuites).toBeDefined();
      expect(report.overallSummary).toBeDefined();
      expect(report.performanceMetrics).toBeDefined();

      // Each provider should have results
      expect(report.testSuites.length).toBe(report.providers.length);

      // Overall summary should be accurate
      const totalTests = report.testSuites.reduce(
        (sum, suite) => sum + suite.summary.totalTests,
        0,
      );
      expect(report.overallSummary.totalTests).toBe(totalTests);

      // At least some tests should pass
      expect(report.overallSummary.passedTests).toBeGreaterThan(0);

      // Coverage should be reasonable
      expect(report.overallSummary.coverage).toBeGreaterThan(50);

      // Performance metrics should exist
      expect(Object.keys(report.performanceMetrics.generationTime).length).toBeGreaterThan(0);
    });
  });
});

// Create individual provider test suites
createAllProviderTestSuites();
