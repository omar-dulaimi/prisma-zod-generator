// Comprehensive Schema Coverage Test
// Dynamically discovers and tests all generated schemas across all providers

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { z } from 'zod';

interface SchemaInfo {
  path: string;
  provider: string;
  category: 'enum' | 'object' | 'operation';
  name: string;
  schema?: z.ZodTypeAny;
}

class ComprehensiveSchemaTest {
  private discoveredSchemas: SchemaInfo[] = [];
  // Per-provider fixtures live under tests/multi-provider/schemas/<provider>/generated/schemas.
  // (This previously pointed at prisma/generated/schemas, a path the project no
  // longer generates, so discovery always came back empty.)
  private basePath = 'tests/multi-provider/schemas';

  /**
   * Discover all schema files across all providers
   */
  async discoverSchemas(): Promise<SchemaInfo[]> {
    const schemas: SchemaInfo[] = [];

    try {
      const providers = readdirSync(this.basePath).filter((dir) => {
        const fullPath = join(this.basePath, dir);
        return statSync(fullPath).isDirectory();
      });

      // Check for root-level generated schemas (prisma/generated/schemas)
      const rootGeneratedPath = join('prisma', 'generated', 'schemas');
      if (this.pathExists(rootGeneratedPath)) {
        await this.discoverProviderSchemas(rootGeneratedPath, 'default', schemas);
      }

      for (const provider of providers) {
        const generatedPath = join(this.basePath, provider, 'generated', 'schemas');

        if (this.pathExists(generatedPath)) {
          await this.discoverProviderSchemas(generatedPath, provider, schemas);
        }
      }
    } catch (error) {
      console.warn('Schema discovery error:', error);
    }

    return schemas;
  }

  /**
   * Discover schemas for a specific provider
   */
  private async discoverProviderSchemas(
    generatedPath: string,
    provider: string,
    schemas: SchemaInfo[],
  ): Promise<void> {
    // Discover enum schemas
    const enumsPath = join(generatedPath, 'enums');
    if (this.pathExists(enumsPath)) {
      const enumFiles = readdirSync(enumsPath).filter((f) => f.endsWith('.schema.ts'));
      for (const file of enumFiles) {
        schemas.push({
          path: join(enumsPath, file),
          provider,
          category: 'enum',
          name: basename(file, '.schema.ts'),
        });
      }
    }

    // Discover object schemas
    const objectsPath = join(generatedPath, 'objects');
    if (this.pathExists(objectsPath)) {
      const objectFiles = readdirSync(objectsPath).filter((f) => f.endsWith('.schema.ts'));
      for (const file of objectFiles) {
        schemas.push({
          path: join(objectsPath, file),
          provider,
          category: 'object',
          name: basename(file, '.schema.ts'),
        });
      }
    }

    // Discover operation schemas (root level)
    const operationFiles = readdirSync(generatedPath).filter(
      (f) => f.endsWith('.schema.ts') && !f.includes('index'),
    );

    for (const file of operationFiles) {
      schemas.push({
        path: join(generatedPath, file),
        provider,
        category: 'operation',
        name: basename(file, '.schema.ts'),
      });
    }
  }

  /**
   * Import and validate a schema
   */
  async importSchema(schemaInfo: SchemaInfo): Promise<boolean> {
    try {
      // Try different import approaches for maximum compatibility
      let module;

      try {
        // Try relative path from project root
        const relativePath = './' + schemaInfo.path.replace('.ts', '');
        module = await import(relativePath);
      } catch {
        try {
          // Try absolute file URL
          const fileUrl = 'file://' + join(process.cwd(), schemaInfo.path);
          module = await import(fileUrl);
        } catch {
          // Try direct filesystem path
          const fsPath = join(process.cwd(), schemaInfo.path).replace('.ts', '');
          module = await import(fsPath);
        }
      }

      if (!module) return false;

      // Find the exported schema (usually the default export or named export)
      const schemaExport =
        module.default ||
        Object.values(module).find(
          (exp: unknown) => exp && typeof exp === 'object' && (exp as { _def?: unknown })._def,
        );

      if (
        schemaExport &&
        typeof schemaExport === 'object' &&
        (schemaExport as { _def?: unknown })._def
      ) {
        schemaInfo.schema = schemaExport as z.ZodTypeAny;
        return true;
      }

      return false;
    } catch {
      // Skip problematic schemas silently to maintain test performance
      return false;
    }
  }

  /**
   * Test a schema with appropriate validation
   */
  testSchema(schemaInfo: SchemaInfo): void {
    if (!schemaInfo.schema) return;

    const schema = schemaInfo.schema;

    try {
      // Test basic validation structure
      expect(schema).toBeDefined();
      expect(schema._def).toBeDefined();

      // Test based on category
      switch (schemaInfo.category) {
        case 'enum':
          this.testEnumSchema(schema, schemaInfo);
          break;
        case 'object':
          this.testObjectSchema(schema, schemaInfo);
          break;
        case 'operation':
          this.testOperationSchema(schema, schemaInfo);
          break;
      }
    } catch (error) {
      console.warn(`Schema test failed for ${schemaInfo.name}:`, error);
      throw error;
    }
  }

  /**
   * Test enum schemas.
   *
   * Every assertion in this class used to be a tautology — `expect(typeof result.success).toBe(
   * 'boolean')` and `expect(result.success || !result.success).toBe(true)` hold for any schema,
   * including a broken one. So the "246/246 validated" figures meant only that safeParse could be
   * called, which is worth something but is not validation.
   */
  private testEnumSchema(schema: z.ZodTypeAny, schemaInfo: SchemaInfo): void {
    // An enum that accepts a value outside its members is not an enum.
    const bogus = schema.safeParse('__definitely_not_an_enum_member__');
    expect(bogus.success, `${schemaInfo.name} accepted a value outside its members`).toBe(false);

    // And it must accept its own members. Reading them defensively: this sweeps every generated
    // enum, and a schema wrapped in a transform or a union would not expose `options`.
    const members = (schema as unknown as { options?: unknown[] }).options;
    if (Array.isArray(members) && members.length > 0 && typeof members[0] === 'string') {
      const first = schema.safeParse(members[0]);
      expect(first.success, `${schemaInfo.name} rejected its own member ${members[0]}`).toBe(true);
    }
  }

  /**
   * Test object schemas
   */
  private testObjectSchema(schema: z.ZodTypeAny, schemaInfo: SchemaInfo): void {
    // A primitive is never a valid object input, whatever the fields are. This is the strongest
    // claim that holds across every generated object schema without knowing its shape.
    for (const primitive of ['a string', 42, true]) {
      const result = schema.safeParse(primitive);
      expect(
        result.success,
        `${schemaInfo.name} accepted the primitive ${JSON.stringify(primitive)}`,
      ).toBe(false);
    }

    // safeParse must not throw on any input; a schema that does is malformed. The empty object and
    // null are the interesting cases because optionality decides them, so the outcome is not
    // asserted — only that asking is safe.
    expect(() => schema.safeParse({})).not.toThrow();
    expect(() => schema.safeParse(null)).not.toThrow();
  }

  /**
   * Test operation schemas
   */
  private testOperationSchema(schema: z.ZodTypeAny, schemaInfo: SchemaInfo): void {
    // Operation args are objects, so a primitive is never valid — the same claim the object
    // schemas get, and again the strongest one available without knowing each schema's shape.
    for (const primitive of ['a string', 42, true]) {
      const result = schema.safeParse(primitive);
      expect(
        result.success,
        `${schemaInfo.name} accepted the primitive ${JSON.stringify(primitive)}`,
      ).toBe(false);
    }

    // A create operation requires `data`, so the empty object must be rejected. Precise per-schema
    // accept/reject behaviour is covered by tests/generated-schema-runtime.test.ts, which works
    // against a known schema rather than sweeping every generated file.
    if (/^create(One|Many)/.test(schemaInfo.name)) {
      expect(
        schema.safeParse({}).success,
        `${schemaInfo.name} accepted args with no data`,
      ).toBe(false);
    }

    expect(() => schema.safeParse({})).not.toThrow();
  }

  /**
   * Check if path exists
   */
  private pathExists(path: string): boolean {
    try {
      statSync(path);
      return true;
    } catch {
      return false;
    }
  }
}

describe('Comprehensive Schema Coverage Tests', () => {
  const tester = new ComprehensiveSchemaTest();
  let allSchemas: SchemaInfo[] = [];

  it('should discover all generated schemas', async () => {
    allSchemas = await tester.discoverSchemas();

    expect(allSchemas.length).toBeGreaterThan(100); // Should find substantial number of schemas

    // Check we have schemas from providers
    const providers = [...new Set(allSchemas.map((s) => s.provider))];
    expect(providers.length).toBeGreaterThanOrEqual(1);

    // Check we have different categories
    const categories = [...new Set(allSchemas.map((s) => s.category))];
    expect(categories).toContain('enum');
    expect(categories).toContain('object');
    expect(categories).toContain('operation');

    console.log(`📊 Discovered ${allSchemas.length} schemas across ${providers.length} providers`);
    console.log(`📋 Providers: ${providers.join(', ')}`);
    console.log(`🗂️  Categories: ${categories.join(', ')}`);
  });

  describe('Provider Schema Tests', () => {
    const providers = ['postgresql', 'mysql', 'mongodb', 'sqlite', 'sqlserver'];

    providers.forEach((provider) => {
      describe(`${provider} Schema Validation`, () => {
        it(`should import and validate all ${provider} schemas`, async () => {
          const providerSchemas = allSchemas.filter((s) => s.provider === provider);

          if (providerSchemas.length === 0) {
            console.warn(`⚠️ No schemas found for provider: ${provider}`);
            return;
          }

          let imported = 0;
          let validated = 0;

          for (const schemaInfo of providerSchemas) {
            const importSuccess = await tester.importSchema(schemaInfo);
            if (importSuccess) {
              imported++;
              try {
                tester.testSchema(schemaInfo);
                validated++;
              } catch (error) {
                console.warn(`Validation failed for ${schemaInfo.name}:`, error);
              }
            }
          }

          console.log(
            `✅ ${provider}: ${imported}/${providerSchemas.length} imported, ${validated}/${imported} validated`,
          );

          // Every provider imports and validates all of its schemas — 246/246 for
          // postgresql, 153/153 mysql, 193/193 mongodb, 149/149 sqlite and sqlserver.
          // The gates here were 50% import and 80% validation, so a change that broke half
          // the generated schemas for a provider passed, and the per-schema warnings above
          // scrolled past in a suite reporting green. Require what the generator delivers.
          expect(imported).toBe(providerSchemas.length);
          expect(validated).toBe(imported);
        });
      });
    });
  });

  describe('Schema Category Tests', () => {
    ['enum', 'object', 'operation'].forEach((category) => {
      it(`should validate all ${category} schemas`, async () => {
        const categorySchemas = allSchemas.filter((s) => s.category === category);

        if (categorySchemas.length === 0) {
          console.warn(`⚠️ No ${category} schemas found`);
          return;
        }

        let successful = 0;
        const sampleSize = Math.min(categorySchemas.length, 100); // Test sample for performance
        const sampleSchemas = categorySchemas.slice(0, sampleSize);

        for (const schemaInfo of sampleSchemas) {
          const importSuccess = await tester.importSchema(schemaInfo);
          if (importSuccess) {
            try {
              tester.testSchema(schemaInfo);
              successful++;
            } catch (error) {
              console.warn(`${category} schema test failed:`, error);
            }
          }
        }

        console.log(`📈 ${category}: ${successful}/${sampleSize} schemas validated successfully`);

        // 32/32 enums, 100/100 objects, 100/100 operations. The gate was 70%.
        expect(successful).toBe(sampleSize);
      });
    });
  });

  describe('Performance Schema Tests', () => {
    it('should measure schema validation performance', async () => {
      // Test a representative sample
      const sampleSchemas = allSchemas.slice(0, 50);
      const startTime = Date.now();

      let processedCount = 0;
      for (const schemaInfo of sampleSchemas) {
        const importSuccess = await tester.importSchema(schemaInfo);
        if (importSuccess) {
          try {
            tester.testSchema(schemaInfo);
            processedCount++;
          } catch {
            // Skip failed validations for performance test
          }
        }
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / processedCount;

      console.log(
        `⚡ Performance: ${processedCount} schemas in ${duration}ms (${avgTime.toFixed(2)}ms avg)`,
      );

      // Should process schemas reasonably quickly
      expect(avgTime).toBeLessThan(100); // Less than 100ms per schema
      expect(processedCount).toBeGreaterThan(0);
    });
  });
});
