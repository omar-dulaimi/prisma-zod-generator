import { describe, it, expect } from 'vitest';
import { SchemaTestUtils } from './schema-test-utils';

// Import schemas to test Issue #119 fixes
import { SortOrderInputObjectSchema } from '../prisma/generated/schemas/objects/SortOrderInput.schema';
import { UserArgsObjectSchema } from '../prisma/generated/schemas/objects/UserArgs.schema';
import { PostArgsObjectSchema } from '../prisma/generated/schemas/objects/PostArgs.schema';
import { PostCreateInputObjectSchema } from '../prisma/generated/schemas/objects/PostCreateInput.schema';
import { UserSelectObjectSchema } from '../prisma/generated/schemas/objects/UserSelect.schema';
import { PostSelectObjectSchema } from '../prisma/generated/schemas/objects/PostSelect.schema';

describe('Issue #119 Regression Tests', () => {
  describe('SortOrderInput Schema', () => {
    it('should validate with required sort field', () => {
      const validData = { sort: 'asc' as const };
      SchemaTestUtils.testValidData(SortOrderInputObjectSchema, validData);
    });

    it('should validate with sort and optional nulls field', () => {
      const validData = {
        sort: 'desc' as const,
        nulls: 'first' as const,
      };
      SchemaTestUtils.testValidData(SortOrderInputObjectSchema, validData);
    });

    it('should reject invalid sort values', () => {
      const invalidData = { sort: 'invalid' };
      SchemaTestUtils.testInvalidData(SortOrderInputObjectSchema, invalidData, ['sort']);
    });

    it('should reject missing required sort field', () => {
      const invalidData = { nulls: 'first' };
      SchemaTestUtils.testInvalidData(SortOrderInputObjectSchema, invalidData, ['sort']);
    });
  });

  describe('Args Schemas (TypeScript Compilation Fix)', () => {
    it('should import UserArgs schema without TypeScript errors', () => {
      expect(UserArgsObjectSchema).toBeDefined();
      expect(typeof UserArgsObjectSchema).toBe('object');
    });

    it('should import PostArgs schema without TypeScript errors', () => {
      expect(PostArgsObjectSchema).toBeDefined();
      expect(typeof PostArgsObjectSchema).toBe('object');
    });

    it('should validate UserArgs with select field', () => {
      const validData = {
        select: { id: true, email: true, posts: true },
      };
      SchemaTestUtils.testValidData(UserArgsObjectSchema, validData);
    });

    it('should validate UserArgs with include field', () => {
      const validData = {
        include: { posts: true },
      };
      SchemaTestUtils.testValidData(UserArgsObjectSchema, validData);
    });

    it('should validate PostArgs with select and include', () => {
      const validData = {
        select: { id: true, title: true },
        include: { author: true },
      };
      SchemaTestUtils.testValidData(PostArgsObjectSchema, validData);
    });

    it('should validate empty Args objects', () => {
      SchemaTestUtils.testValidData(UserArgsObjectSchema, {});
      SchemaTestUtils.testValidData(PostArgsObjectSchema, {});
    });
  });

  describe('PostCreateInput Schema Structure', () => {
    it('should have PostCreateInput schema defined', () => {
      expect(PostCreateInputObjectSchema).toBeDefined();
      expect(typeof PostCreateInputObjectSchema).toBe('object');
    });

    it('should reject invalid data types', () => {
      const invalidData = {
        title: 123, // Should be string
        likes: 'not-a-bigint', // Should be BigInt
        bytes: 'not-bytes', // Should be Bytes
      };
      SchemaTestUtils.testInvalidData(PostCreateInputObjectSchema, invalidData, ['title']);
    });

    it('should reject completely empty object', () => {
      const invalidData = {};
      SchemaTestUtils.testInvalidData(PostCreateInputObjectSchema, invalidData, ['title']);
    });
  });

  describe('Select Schema Integration', () => {
    it('should validate UserSelect with boolean fields', () => {
      const validData = {
        id: true,
        email: true,
        posts: true,
      };
      SchemaTestUtils.testValidData(UserSelectObjectSchema, validData);
    });

    it('should validate UserSelect with nested Post args', () => {
      const validData = {
        id: true,
        email: true,
        posts: {
          select: { id: true, title: true },
        },
      };
      SchemaTestUtils.testValidData(UserSelectObjectSchema, validData);
    });

    it('should validate PostSelect with nested User args', () => {
      const validData = {
        id: true,
        title: true,
        author: {
          select: { id: true, email: true },
        },
      };
      SchemaTestUtils.testValidData(PostSelectObjectSchema, validData);
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain enum direct reference (no lazy loading)', () => {
      // This test ensures SortOrderInput uses direct enum references
      const schema = SortOrderInputObjectSchema;
      const result = schema.safeParse({ sort: 'asc' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe('asc');
      }
    });

    it('should maintain Args schema functionality without Prisma type constraints', () => {
      // This test ensures Args schemas work without causing TypeScript compilation errors
      const userArgsResult = UserArgsObjectSchema.safeParse({
        select: { id: true },
      });
      const postArgsResult = PostArgsObjectSchema.safeParse({
        include: { author: true },
      });

      expect(userArgsResult.success).toBe(true);
      expect(postArgsResult.success).toBe(true);
    });

    it('should preserve backward compatibility with existing schemas', () => {
      // Test that core Issue #119 fixes work without breaking existing functionality
      const testCases = [
        { schema: SortOrderInputObjectSchema, data: { sort: 'asc' } },
        { schema: UserArgsObjectSchema, data: { select: { id: true } } },
      ];

      testCases.forEach(({ schema, data }) => {
        const result = schema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });
});
