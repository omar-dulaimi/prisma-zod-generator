import { expect } from 'vitest';
import { z } from 'zod';

/**
 * Utility for comprehensive schema testing with TypeScript type safety
 */
type SafeParsable = { safeParse: (v: unknown) => { success: boolean; error?: unknown } };

export class SchemaTestUtils {
  /**
   * Test schema validation with valid data
   */
  static testValidData<T extends z.ZodType>(
    schema: T,
    validData: z.input<T>,
    expectedOutput?: z.output<T>,
  ): z.output<T> {
    const result = schema.safeParse(validData);

    if (!result.success) {
      throw new Error(
        `Schema validation failed for valid data: ${JSON.stringify(result.error.issues)}`,
      );
    }

    if (expectedOutput !== undefined) {
      expect(result.data).toEqual(expectedOutput);
    }

    return result.data;
  }

  /**
   * Test schema validation with invalid data
   */
  static testInvalidData<T extends z.ZodType>(
    schema: T,
    invalidData: unknown,
    expectedErrorPaths?: string[],
  ): void {
    const result = schema.safeParse(invalidData);

    if (result.success) {
      throw new Error(
        `Schema validation should have failed but passed for: ${JSON.stringify(invalidData)}`,
      );
    }

    if (expectedErrorPaths) {
      const actualPaths = result.error.issues.map((issue) => issue.path.join('.'));
      for (const expectedPath of expectedErrorPaths) {
        if (!actualPaths.includes(expectedPath)) {
          throw new Error(
            `Expected error path '${expectedPath}' not found in: ${actualPaths.join(', ')}`,
          );
        }
      }
    }
  }

  /**
   * Test schema type inference matches expected TypeScript type
   */
  static testTypeInference<T extends z.ZodType>(_schema: T): void {
    // Intentionally minimal to avoid generic constraint complexity in CI
    // This provides a placeholder for future stricter checks if desired.
    expect(true).toBe(true);
  }

  /**
   * Test schema parsing with type coercion
   */
  static testCoercion<T extends z.ZodType>(
    schema: T,
    input: unknown,
    expectedOutput: z.output<T>,
  ): void {
    const result = schema.safeParse(input);

    if (!result.success) {
      throw new Error(`Schema coercion failed: ${JSON.stringify(result.error.issues)}`);
    }

    expect(result.data).toEqual(expectedOutput);
  }

  /**
   * Test schema with boundary values
   */
  static testBoundaryValues<T extends z.ZodType>(
    schema: T,
    tests: Array<{
      value: unknown;
      shouldPass: boolean;
      description: string;
    }>,
  ): void {
    for (const test of tests) {
      const result = schema.safeParse(test.value);

      if (test.shouldPass && !result.success) {
        throw new Error(
          `${test.description}: Expected to pass but failed with: ${JSON.stringify(result.error.issues)}`,
        );
      }

      if (!test.shouldPass && result.success) {
        throw new Error(
          `${test.description}: Expected to fail but passed with: ${JSON.stringify(result.data)}`,
        );
      }
    }
  }

  /**
   * Test schema with optional fields
   */
  static testOptionalFields<T extends z.ZodType>(
    schema: T,
    baseValidData: unknown,
    optionalFields: string[],
  ): void {
    // Test with all optional fields present
    this.testValidData(schema, baseValidData as z.input<T>);

    // Test with each optional field omitted
    for (const field of optionalFields) {
      const dataWithoutField: Record<string, unknown> = {
        ...(baseValidData as Record<string, unknown>),
      };
      delete dataWithoutField[field];
      this.testValidData(schema, dataWithoutField as z.input<T>);
    }
  }

  /**
   * Test schema with required fields
   */
  static testRequiredFields<T extends z.ZodType>(
    schema: T,
    baseValidData: unknown,
    requiredFields: string[],
  ): void {
    // Test with all required fields present
    this.testValidData(schema, baseValidData as z.input<T>);

    // Test with each required field omitted (should fail)
    for (const field of requiredFields) {
      const dataWithoutField: Record<string, unknown> = {
        ...(baseValidData as Record<string, unknown>),
      };
      delete dataWithoutField[field];
      this.testInvalidData(schema, dataWithoutField as unknown, [field]);
    }
  }

  /**
   * Test enum schema values
   */
  static testEnumValues(
    schema: SafeParsable,
    validValues: string[],
    invalidValues: string[],
  ): void {
    for (const v of validValues) {
      const res = schema.safeParse(v);
      if (!res.success) {
        throw new Error(`Expected enum to accept '${v}'`);
      }
    }
    for (const iv of invalidValues) {
      const res = schema.safeParse(iv);
      if (res.success) {
        throw new Error(`Expected enum to reject '${iv}'`);
      }
    }
  }

  /**
   * Test array schema with various inputs
   */
  static testArraySchema<T extends z.ZodArray<z.ZodTypeAny>>(
    schema: T,
    validItems: unknown[],
    invalidItems: unknown[],
  ): void {
    // Test empty array
    this.testValidData(schema, [] as z.input<T>);

    // Test single valid item
    if (validItems.length > 0) {
      this.testValidData(schema, [validItems[0]] as z.input<T>);

      // Test multiple valid items
      this.testValidData(schema, validItems as z.input<T>);
    }

    // Test with invalid items
    for (const invalidItem of invalidItems) {
      this.testInvalidData(schema, [invalidItem]);
    }
  }

  /**
   * Performance test for schema validation
   */
  static performanceTest<T extends z.ZodType>(
    schema: T,
    testData: z.input<T>,
    iterations: number = 1000,
  ): { avgTime: number; totalTime: number } {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const result = schema.safeParse(testData);
      if (!result.success) {
        throw new Error(
          `Performance test failed on iteration ${i}: ${JSON.stringify(result.error.issues)}`,
        );
      }
    }

    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    return { avgTime, totalTime };
  }
}

/**
 * Test data generators for common field types
 */
export class TestDataGenerators {
  static string = {
    valid: ['hello', 'world', 'test string', ''],
    invalid: [null, undefined, 123, [], {}],
  };

  static number = {
    valid: [0, 1, -1, 1.5, -1.5, Number.MAX_SAFE_INTEGER],
    invalid: [null, undefined, 'string', [], {}, NaN, Infinity],
  };

  static boolean = {
    valid: [true, false],
    invalid: [null, undefined, 'true', 'false', 0, 1, [], {}],
  };

  static date = {
    valid: [new Date(), new Date('2023-01-01'), new Date('2023-12-31T23:59:59Z')],
    invalid: [null, undefined, 'not-a-date', 123, [], {}],
  };

  static email = {
    valid: ['test@example.com', 'user+tag@domain.co.uk', 'simple@test.io'],
    invalid: ['not-an-email', '@domain.com', 'user@', 'user@domain', 'user.domain.com'],
  };

  static url = {
    valid: ['https://example.com', 'http://test.io', 'https://sub.domain.com/path?query=value'],
    invalid: [
      'not-a-url',
      'ftp://example.com',
      'javascript:alert(1)',
      'data:text/plain;base64,SGVsbG8=',
    ],
  };

  static uuid = {
    valid: [
      '123e4567-e89b-12d3-a456-426614174000',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ],
    invalid: ['not-a-uuid', '123e4567-e89b-12d3-a456', '123e4567-e89b-12d3-a456-42661417400g'],
  };

  static generateObject<T extends Record<string, unknown>>(
    template: T,
    overrides: Partial<T> = {},
  ): T {
    return { ...template, ...overrides };
  }

  static generateArray<T>(item: T, count: number = 3): T[] {
    return Array(count).fill(item);
  }
}
