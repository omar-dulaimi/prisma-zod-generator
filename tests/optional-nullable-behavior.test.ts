import { describe, it } from 'vitest';
import { SchemaTestUtils } from './schema-test-utils';

// Generated object schemas under prisma/generated
import { PostCreateInputObjectSchema } from '../prisma/generated/schemas/objects/PostCreateInput.schema';
import { UserCreateInputObjectSchema } from '../prisma/generated/schemas/objects/UserCreateInput.schema';
import { UserCreateNestedOneWithoutPostsInputObjectSchema } from '../prisma/generated/schemas/objects/UserCreateNestedOneWithoutPostsInput.schema';
import { UserWhereInputObjectSchema } from '../prisma/generated/schemas/objects/UserWhereInput.schema';

describe('Optional vs Nullable behavior in object schemas', () => {
  describe('PostCreateInputObjectSchema', () => {
    const base: any = {
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
    const base: any = {
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

  describe('Where input tolerates null for optional non-relation unions', () => {
    it('UserWhereInputObjectSchema: AND/OR/NOT/email/name/password/role accept null due to optional + nullable', () => {
      // All of these became optional().nullable() for non-relation fields
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { AND: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { OR: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { NOT: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { email: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { name: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { password: null });
      SchemaTestUtils.testValidData(UserWhereInputObjectSchema, { role: null });

      // posts is a relation filter and should remain optional-only (no nullable)
      SchemaTestUtils.testInvalidData(UserWhereInputObjectSchema, { posts: null }, ['posts']);
    });
  });
});
