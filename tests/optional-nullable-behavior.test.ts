import { afterAll, beforeAll, describe, it } from 'vitest';
import { z } from 'zod';
import { SchemaTestUtils } from './schema-test-utils';
import {
  createUserPostObjectsFixture,
  type UserPostFixture,
} from './helpers/user-post-objects-fixture';

// The object schemas under test are generated on demand: this file used to
// import them from a committed prisma/generated fixture that the project no
// longer produces.
let PostCreateInputObjectSchema: z.ZodTypeAny;
let UserCreateInputObjectSchema: z.ZodTypeAny;
let UserCreateNestedOneWithoutPostsInputObjectSchema: z.ZodTypeAny;
let UserWhereInputObjectSchema: z.ZodTypeAny;
let fixture: UserPostFixture;

beforeAll(async () => {
  fixture = await createUserPostObjectsFixture('optional-nullable-behavior');
  const load = async (base: string, exportName: string) =>
    (await fixture.load<Record<string, z.ZodTypeAny>>(base))[exportName];

  PostCreateInputObjectSchema = await load('PostCreateInput', 'PostCreateInputObjectSchema');
  UserCreateInputObjectSchema = await load('UserCreateInput', 'UserCreateInputObjectSchema');
  UserCreateNestedOneWithoutPostsInputObjectSchema = await load(
    'UserCreateNestedOneWithoutPostsInput',
    'UserCreateNestedOneWithoutPostsInputObjectSchema',
  );
  UserWhereInputObjectSchema = await load('UserWhereInput', 'UserWhereInputObjectSchema');
}, 300000);

afterAll(async () => {
  await fixture?.cleanup();
});

describe('Optional vs Nullable behavior in object schemas', () => {
  describe('PostCreateInputObjectSchema', () => {
    const base: Partial<z.input<typeof PostCreateInputObjectSchema>> = {
      title: 'Hello',
      likes: BigInt(0),
    };

    it('optional scalar/enum fields accept null (optional + nullable)', () => {
      // createdAt/updatedAt are optional + nullable with coerce.date()
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base, createdAt: null });
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base, updatedAt: null });

      // content is String? -> optional + nullable
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base, content: null });

      // published optional boolean -> optional + nullable
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base, published: null });

      // viewCount optional int -> optional + nullable
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base, viewCount: null });

      // bytes optional bytes -> optional + nullable
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base, bytes: null });
    });

    it('optional relation field remains optional-only (rejects null)', () => {
      // author is relation-shaped and should NOT be nullable
      SchemaTestUtils.testInvalidData(PostCreateInputObjectSchema, { ...base, author: null }, [
        'author',
      ]);

      // Omission of author is allowed (optional)
      SchemaTestUtils.testValidData(PostCreateInputObjectSchema, { ...base });
    });
  });

  describe('UserCreateInputObjectSchema', () => {
    const base: Partial<z.input<typeof UserCreateInputObjectSchema>> = {
      email: 'test@example.com',
      password: 'P@ssw0rd',
    };

    it('optional non-relation fields accept null (name, role)', () => {
      SchemaTestUtils.testValidData(UserCreateInputObjectSchema, { ...base, name: null });
      SchemaTestUtils.testValidData(UserCreateInputObjectSchema, { ...base, role: null });
    });

    it('optional relation field (posts) remains optional-only (rejects null)', () => {
      SchemaTestUtils.testInvalidData(UserCreateInputObjectSchema, { ...base, posts: null }, [
        'posts',
      ]);
      SchemaTestUtils.testValidData(UserCreateInputObjectSchema, { ...base });
    });
  });

  describe('Nested relation operation args remain optional-only', () => {
    it('UserCreateNestedOneWithoutPostsInput: create/connectOrCreate/connect reject null', () => {
      // Each of these is relation-shaped and should be optional-only (no nullable)
      SchemaTestUtils.testInvalidData(
        UserCreateNestedOneWithoutPostsInputObjectSchema,
        { create: null },
        ['create'],
      );
      SchemaTestUtils.testInvalidData(
        UserCreateNestedOneWithoutPostsInputObjectSchema,
        { connectOrCreate: null },
        ['connectOrCreate'],
      );
      SchemaTestUtils.testInvalidData(
        UserCreateNestedOneWithoutPostsInputObjectSchema,
        { connect: null },
        ['connect'],
      );

      // Omitting fields is OK
      SchemaTestUtils.testValidData(UserCreateNestedOneWithoutPostsInputObjectSchema, {});
    });
  });

  describe('Where input null handling follows column nullability', () => {
    it('accepts null only for filters on nullable columns', () => {
      // name and role are nullable in the model, so `null` is a meaningful
      // filter (IS NULL) and the union is optional().nullable().
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { name: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { role: null });
    });

    it('rejects null for filters on non-nullable columns', () => {
      // email and password are required columns: they can never be null, so the
      // filter union is optional() only. Accepting null here would let an
      // impossible query type-check.
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { email: null }, ['email']);
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { password: null }, ['password']);
    });

    it('rejects null for the logical operators and relation filters', () => {
      // AND/OR/NOT mirror Prisma's own types (WhereInput | WhereInput[]), which
      // are not nullable, and relation filters stay optional-only.
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { AND: null }, ['AND']);
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { OR: null }, ['OR']);
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { NOT: null }, ['NOT']);
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { posts: null }, ['posts']);
    });
  });
});
