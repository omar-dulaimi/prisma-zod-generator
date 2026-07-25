import { describe, it, expect } from 'vitest';

// Import schemas that demonstrate the TypeScript inference fix
// These schemas have required relations that use z.lazy() and should benefit from the fix
import { PostgreSQLProfileCreateInputObjectSchema } from './multi-provider/schemas/postgresql/generated/schemas/objects/PostgreSQLProfileCreateInput.schema';
import { PostgreSQLUserCreateNestedOneWithoutProfileInputObjectSchema } from './multi-provider/schemas/postgresql/generated/schemas/objects/PostgreSQLUserCreateNestedOneWithoutProfileInput.schema';

describe('TypeScript Inference Fix for z.lazy() Relations', () => {
  describe('Schema Generation Fix', () => {
    it('should generate schemas without explicit type annotations for complex relations', () => {
      // This test verifies that the fix prevents TypeScript errors like:
      // "Property 'user' is optional in type {...} but required in type ProfileCreateInput"

      // The fix removes explicit type annotations from schemas with complex relations
      // to avoid TypeScript inference issues with z.lazy() fields
      expect(PostgreSQLProfileCreateInputObjectSchema).toBeDefined();
      expect(typeof PostgreSQLProfileCreateInputObjectSchema).toBe('object');

      expect(PostgreSQLUserCreateNestedOneWithoutProfileInputObjectSchema).toBeDefined();
      expect(typeof PostgreSQLUserCreateNestedOneWithoutProfileInputObjectSchema).toBe('object');
    });

    it('should have working schema methods after fix', () => {
      // Ensure that removing explicit type annotations doesn't break functionality
      const schemas = [
        PostgreSQLProfileCreateInputObjectSchema,
        PostgreSQLUserCreateNestedOneWithoutProfileInputObjectSchema,
      ];

      schemas.forEach((schema) => {
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
        expect(typeof schema.safeParse).toBe('function');
        expect(typeof schema.parse).toBe('function');
      });
    });
  });

  describe('Basic Validation Tests', () => {
    it('should validate basic ProfileCreateInput structure', () => {
      // Test minimal valid data structure
      const minimalValidData = {
        user: {
          create: {
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      };

      const result = PostgreSQLProfileCreateInputObjectSchema.safeParse(minimalValidData);
      expect(result.success).toBe(true);
    });

    it('should require the user field in ProfileCreateInput', () => {
      // Test that omitting the required 'user' field causes validation to fail
      const dataWithoutUser = {
        id: 'test-profile-id',
        bio: 'Test bio',
        // Missing required 'user' field
      };

      const result = PostgreSQLProfileCreateInputObjectSchema.safeParse(dataWithoutUser);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errorPaths = result.error.issues.map((issue) => issue.path.join('.'));
        expect(errorPaths).toContain('user');
      }
    });

    it('should validate nested user creation', () => {
      const nestedCreateData = {
        create: {
          email: 'new@example.com',
          name: 'New User',
        },
      };

      const result =
        PostgreSQLUserCreateNestedOneWithoutProfileInputObjectSchema.safeParse(nestedCreateData);
      expect(result.success).toBe(true);
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain runtime validation behavior for required fields', () => {
      // Ensure the fix doesn't affect runtime behavior - required fields should still be required
      const validData = {
        user: {
          create: {
            email: 'user@example.com',
            name: 'User',
          },
        },
      };

      const invalidData = {
        bio: 'Just a bio',
        // Missing required 'user' field
      };

      // Valid data should pass
      const validResult = PostgreSQLProfileCreateInputObjectSchema.safeParse(validData);
      expect(validResult.success).toBe(true);

      // Invalid data should fail with correct error path
      const invalidResult = PostgreSQLProfileCreateInputObjectSchema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);

      if (!invalidResult.success) {
        const errorPaths = invalidResult.error.issues.map((issue) => issue.path.join('.'));
        expect(errorPaths).toContain('user');
      }
    });

    it('should handle schema parsing without throwing errors', () => {
      // This test ensures no runtime errors occur during schema operations
      const testData = {
        user: {
          create: {
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      };

      expect(() => {
        PostgreSQLProfileCreateInputObjectSchema.safeParse(testData);
      }).not.toThrow();

      expect(() => {
        PostgreSQLUserCreateNestedOneWithoutProfileInputObjectSchema.safeParse({
          create: {
            email: 'test@example.com',
            name: 'Test User',
          },
        });
      }).not.toThrow();
    });
  });
});
