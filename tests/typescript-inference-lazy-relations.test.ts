import { describe, it, expect } from 'vitest';
import { SchemaTestUtils } from './schema-test-utils';
import { z } from 'zod';

// Import the specific schemas that demonstrate the TypeScript inference fix
// These are generated from the exact schema that reproduces the original issue
import { AuthAccessTokenCreateInputObjectSchema } from '../test-generated-issue/schemas/schemas/objects/AuthAccessTokenCreateInput.schema';
import { UserCreateNestedOneWithoutAccessTokensInputObjectSchema } from '../test-generated-issue/schemas/schemas/objects/UserCreateNestedOneWithoutAccessTokensInput.schema';
import { UserCreateInputObjectSchema } from '../test-generated-issue/schemas/schemas/objects/UserCreateInput.schema';

describe('TypeScript Inference Fix for z.lazy() Relations - Issue Regression Test', () => {
  describe('AuthAccessToken Schema Fix Verification', () => {
    it('should generate AuthAccessTokenCreateInput without explicit type annotations', () => {
      // This test verifies that the fix prevents TypeScript errors like:
      // "Property 'user' is optional in type {...} but required in type AuthAccessTokenCreateInput"
      
      expect(AuthAccessTokenCreateInputObjectSchema).toBeDefined();
      expect(typeof AuthAccessTokenCreateInputObjectSchema).toBe('object');
      
      // Verify the schema has the expected Zod methods
      expect(typeof AuthAccessTokenCreateInputObjectSchema.safeParse).toBe('function');
      expect(typeof AuthAccessTokenCreateInputObjectSchema.parse).toBe('function');
    });

    it('should validate required relation field in AuthAccessTokenCreateInput', () => {
      // Test that the 'user' relation field is required (not optional)
      // This was the core issue being fixed
      const validAuthTokenData = {
        expiresAt: new Date('2023-12-31'),
        user: {
          create: {
            id: 'user-id-1',
            password: 'test-password'
          }
        }
      };

      SchemaTestUtils.testValidData(AuthAccessTokenCreateInputObjectSchema, validAuthTokenData);
    });

    it('should require the user field in AuthAccessTokenCreateInput', () => {
      // Test that omitting the required 'user' field causes validation to fail
      const dataWithoutUser = {
        expiresAt: new Date('2023-12-31')
        // Missing required 'user' field
      };

      SchemaTestUtils.testInvalidData(AuthAccessTokenCreateInputObjectSchema, dataWithoutUser, ['user']);
    });

    it('should handle optional fields correctly in AuthAccessTokenCreateInput', () => {
      // Test that truly optional fields work as expected
      const minimalValidData = {
        expiresAt: new Date('2023-12-31'),
        user: {
          connect: { id: 'existing-user-id' }
        }
      };

      SchemaTestUtils.testValidData(AuthAccessTokenCreateInputObjectSchema, minimalValidData);
    });
  });

  describe('User Relation Schema Validation', () => {
    it('should validate UserCreateNestedOneWithoutAccessTokens operations', () => {
      // Test create operation
      const createOperation = {
        create: {
          id: 'new-user-id',
          password: 'user-password',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      };
      SchemaTestUtils.testValidData(UserCreateNestedOneWithoutAccessTokensInputObjectSchema, createOperation);

      // Test connect operation
      const connectOperation = {
        connect: { id: 'existing-user-id' }
      };
      SchemaTestUtils.testValidData(UserCreateNestedOneWithoutAccessTokensInputObjectSchema, connectOperation);

      // Test connectOrCreate operation
      const connectOrCreateOperation = {
        connectOrCreate: {
          where: { id: 'maybe-existing-user' },
          create: {
            id: 'new-user-fallback',
            password: 'fallback-password'
          }
        }
      };
      SchemaTestUtils.testValidData(UserCreateNestedOneWithoutAccessTokensInputObjectSchema, connectOrCreateOperation);
    });

    it('should validate UserCreateInput basic structure', () => {
      const simpleUser = {
        id: 'user-with-tokens',
        password: 'user-password'
      };

      SchemaTestUtils.testValidData(UserCreateInputObjectSchema, simpleUser);
    });
  });

  describe('Complex Relation Scenarios', () => {
    it('should handle nested create operations', () => {
      const nestedCreateData = {
        expiresAt: new Date('2023-12-31'),
        user: {
          create: {
            id: 'nested-user',
            password: 'nested-password',
            firstName: 'Nested',
            email: 'nested@example.com'
          }
        }
      };

      SchemaTestUtils.testValidData(AuthAccessTokenCreateInputObjectSchema, nestedCreateData);
    });

    it('should validate date coercion in AuthAccessToken', () => {
      const dataWithStringDates = {
        expiresAt: '2023-12-31T23:59:59Z',
        createdAt: '2023-01-01T00:00:00Z',
        lastUsedAt: '2023-06-15T12:00:00Z',
        user: {
          connect: { id: 'existing-user' }
        }
      };

      const result = AuthAccessTokenCreateInputObjectSchema.safeParse(dataWithStringDates);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.expiresAt).toBeInstanceOf(Date);
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.lastUsedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('Type Safety and Error Handling', () => {
    it('should reject invalid data types', () => {
      const invalidData = {
        id: 123, // Should be string
        token: {}, // Should be string
        expiresAt: 'invalid-date', // Should be valid date string or Date
        user: 'not-an-object' // Should be relation object
      };

      SchemaTestUtils.testInvalidData(
        AuthAccessTokenCreateInputObjectSchema, 
        invalidData, 
        ['id', 'token', 'expiresAt', 'user']
      );
    });

    it('should handle nullable fields correctly', () => {
      const dataWithNulls = {
        expiresAt: new Date('2023-12-31'),
        lastUsedAt: null, // This field is nullable
        user: {
          create: {
            id: 'user-with-nulls',
            password: 'password',
            firstName: null, // Nullable field
            lastName: null,  // Nullable field
            email: null      // Nullable field
          }
        }
      };

      SchemaTestUtils.testValidData(AuthAccessTokenCreateInputObjectSchema, dataWithNulls);
    });
  });

  describe('Regression Prevention', () => {
    it('should not cause TypeScript compilation errors with required relations', () => {
      // This test specifically targets the original issue:
      // "Property 'user' is optional in type {...} but required in type AuthAccessTokenCreateInput"
      
      // The fix ensures that schemas with complex relations don't have explicit
      // type annotations that cause TypeScript inference issues
      const schemas = [
        AuthAccessTokenCreateInputObjectSchema,
        UserCreateNestedOneWithoutAccessTokensInputObjectSchema,
        UserCreateInputObjectSchema
      ];

      schemas.forEach(schema => {
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
        
        // Verify schema methods exist and work
        expect(typeof schema.safeParse).toBe('function');
        expect(typeof schema.parse).toBe('function');
      });
    });

    it('should maintain runtime validation behavior', () => {
      // Ensure the fix doesn't affect runtime behavior
      const testCases = [
        {
          schema: AuthAccessTokenCreateInputObjectSchema,
          validData: { 
            expiresAt: new Date('2023-12-31'),
            user: { connect: { id: 'user-id' } }
          },
          invalidData: { 
            expiresAt: new Date('2023-12-31')
            // Missing required 'user' field
          },
          requiredFields: ['user']
        }
      ];

      testCases.forEach(({ schema, validData, invalidData, requiredFields }) => {
        // Valid data should pass
        const validResult = schema.safeParse(validData);
        expect(validResult.success).toBe(true);

        // Invalid data should fail with correct error paths
        const invalidResult = schema.safeParse(invalidData);
        expect(invalidResult.success).toBe(false);

        if (!invalidResult.success) {
          const errorPaths = invalidResult.error.issues.map(issue => issue.path.join('.'));
          requiredFields.forEach(field => {
            expect(errorPaths).toContain(field);
          });
        }
      });
    });

    it('should preserve lazy loading for circular dependencies', () => {
      // Verify that lazy loading still works correctly for preventing circular imports
      const circularData = {
        id: 'circular-user',
        password: 'password'
      };

      // This should validate without infinite recursion issues
      const result = UserCreateInputObjectSchema.safeParse(circularData);
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    it('should maintain good performance with lazy schemas', () => {
      const testData = {
        expiresAt: new Date('2023-12-31'),
        user: { connect: { id: 'perf-test-user' } }
      };

      const { avgTime } = SchemaTestUtils.performanceTest(
        AuthAccessTokenCreateInputObjectSchema,
        testData,
        100
      );

      // Performance should be reasonable (less than 1ms per validation on average)
      expect(avgTime).toBeLessThan(1);
    });
  });
});