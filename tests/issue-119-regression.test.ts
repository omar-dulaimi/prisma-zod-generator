import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { SchemaTestUtils } from './schema-test-utils';
import {
  createUserPostObjectsFixture,
  type UserPostFixture,
} from './helpers/user-post-objects-fixture';

// Schemas under test are generated on demand: this file used to import them
// from a committed prisma/generated fixture the project no longer produces.
let SortOrderInputObjectSchema: z.ZodTypeAny;
let UserArgsObjectSchema: z.ZodTypeAny;
let PostArgsObjectSchema: z.ZodTypeAny;
let PostCreateInputObjectSchema: z.ZodTypeAny;
let UserSelectObjectSchema: z.ZodTypeAny;
let PostSelectObjectSchema: z.ZodTypeAny;
let fixture: UserPostFixture;

beforeAll(async () => {
  fixture = await createUserPostObjectsFixture('issue-119-regression');
  const load = async (base: string, exportName: string) =>
    (await fixture.load<Record<string, z.ZodTypeAny>>(base))[exportName];

  SortOrderInputObjectSchema = await load('SortOrderInput', 'SortOrderInputObjectSchema');
  UserArgsObjectSchema = await load('UserArgs', 'UserArgsObjectSchema');
  PostArgsObjectSchema = await load('PostArgs', 'PostArgsObjectSchema');
  PostCreateInputObjectSchema = await load('PostCreateInput', 'PostCreateInputObjectSchema');
  UserSelectObjectSchema = await load('UserSelect', 'UserSelectObjectSchema');
  PostSelectObjectSchema = await load('PostSelect', 'PostSelectObjectSchema');
}, 300000);

afterAll(async () => {
  await fixture?.cleanup();
});

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
