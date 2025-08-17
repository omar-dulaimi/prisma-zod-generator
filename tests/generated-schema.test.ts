import { describe, expect, it } from 'vitest';
import { SchemaTestUtils } from './schema-test-utils';

// Import generated schemas (updated to match current filtering config)
import { UserCreateManySchema } from '../prisma/generated/schemas/createManyUser.schema';
import { SortOrderSchema } from '../prisma/generated/schemas/enums/SortOrder.schema';
import { UserScalarFieldEnumSchema } from '../prisma/generated/schemas/enums/UserScalarFieldEnum.schema';
import { PostFindManySchema } from '../prisma/generated/schemas/findManyPost.schema';
import { UserFindManySchema } from '../prisma/generated/schemas/findManyUser.schema';

// Import object schemas
import { StringFilterObjectSchema } from '../prisma/generated/schemas/objects/StringFilter.schema';
import { UserCreateInputObjectSchema } from '../prisma/generated/schemas/objects/UserCreateInput.schema';
import { UserWhereInputObjectSchema } from '../prisma/generated/schemas/objects/UserWhereInput.schema';

describe('Generated Schema Tests', () => {
  // Local Role enum-like constant so tests don't depend on @prisma/client generation
  const Role = { USER: 'USER', ADMIN: 'ADMIN' } as const;
  describe('Operation Schemas', () => {
    describe('UserFindManySchema', () => {
      it('should validate with minimal input', () => {
        SchemaTestUtils.testValidData(UserFindManySchema, {});
      });

      it('should validate with all optional fields', () => {
        const validData = {
          select: { id: true, email: true },
          include: { posts: true },
          where: { email: 'test@example.com' },
          orderBy: { email: 'desc' as const }, // Use valid field from schema
          take: 10,
          skip: 5,
          distinct: ['id', 'email'] as ('id' | 'email' | 'name')[],
        };

        SchemaTestUtils.testValidData(UserFindManySchema, validData);
      });

      it('should reject invalid field types', () => {
        SchemaTestUtils.testInvalidData(
          UserFindManySchema,
          {
            take: 'invalid',
            skip: 'invalid',
          },
          ['take', 'skip'],
        );
      });

      it('should test optional fields correctly', () => {
        const baseData = {
          where: { email: 'test@example.com' },
          take: 10,
        };

        SchemaTestUtils.testOptionalFields(UserFindManySchema, baseData, [
          'select',
          'include',
          'orderBy',
          'cursor',
          'take',
          'skip',
          'distinct',
        ]);
      });
    });

    describe('UserCreateManySchema', () => {
      it('should validate with required data', () => {
        const validData = {
          data: {
            email: 'test@example.com',
            name: 'Test User',
            password: 'P@ssw0rd123',
            role: Role.USER,
          },
        };

        SchemaTestUtils.testValidData(UserCreateManySchema, validData);
      });

      it('should validate with array data', () => {
        const validData = {
          data: [
            {
              email: 'test1@example.com',
              name: 'Test User 1',
              password: 'P@ssw0rd123',
              role: Role.USER,
            },
            {
              email: 'test2@example.com',
              name: 'Test User 2',
              password: 'P@ssw0rd456',
              role: Role.ADMIN,
            },
          ],
        };

        SchemaTestUtils.testValidData(UserCreateManySchema, validData);
      });

      it('should reject missing required fields', () => {
        SchemaTestUtils.testInvalidData(UserCreateManySchema, {
          data: {
            name: 'Test User',
            // missing email
          },
        });
      });
    });

    describe('PostFindManySchema', () => {
      it('should validate array orderBy', () => {
        const validData = {
          orderBy: [{ id: 'desc' as const }, { title: 'asc' as const }],
        };

        SchemaTestUtils.testValidData(PostFindManySchema, validData);
      });
    });
  });

  describe('Enum Schemas', () => {
    describe('UserScalarFieldEnumSchema', () => {
      it('should validate correct enum values', () => {
        const validValues = ['id', 'email', 'name'];
        const invalidValues = ['invalid', 'createdAt', 'updatedAt'];

        SchemaTestUtils.testEnumValues(UserScalarFieldEnumSchema, validValues, invalidValues);
      });
    });

    describe('SortOrderSchema', () => {
      it('should validate sort order values', () => {
        const validValues = ['asc', 'desc'];
        const invalidValues = ['ascending', 'descending', 'ASC', 'DESC'];

        SchemaTestUtils.testEnumValues(SortOrderSchema, validValues, invalidValues);
      });
    });
  });

  describe('Object Schemas', () => {
    describe('UserCreateInputObjectSchema', () => {
      it('should validate with required fields', () => {
        const validData = {
          email: 'test@example.com',
          name: 'Test User',
          password: 'P@ssw0rd123',
          role: Role.USER,
        };

        SchemaTestUtils.testValidData(UserCreateInputObjectSchema, validData);
      });

      it('should validate with optional relations', () => {
        const validData = {
          email: 'test@example.com',
          name: 'Test User',
          password: 'P@ssw0rd123',
          role: Role.USER,
          posts: {
            create: {
              title: 'Test Post',
              content: 'Test content',
              likes: BigInt(0),
              bytes: new Uint8Array([1, 2, 3]),
            },
          },
        };

        SchemaTestUtils.testValidData(UserCreateInputObjectSchema, validData);
      });

      it('should test required fields', () => {
        const baseData = {
          email: 'test@example.com',
          name: 'Test User',
          password: 'P@ssw0rd123',
          role: Role.USER,
        };

        SchemaTestUtils.testRequiredFields(UserCreateInputObjectSchema, baseData, ['email']);
      });
    });

    describe('UserWhereInputObjectSchema', () => {
      it('should validate with string filters', () => {
        const validData = {
          email: {
            equals: 'test@example.com',
          },
          name: {
            contains: 'Test',
          },
        };

        SchemaTestUtils.testValidData(UserWhereInputObjectSchema, validData);
      });

      it('should validate with logical operators', () => {
        const validData = {
          AND: [{ email: { contains: 'test' } }, { name: { not: null } }],
          OR: [{ email: { endsWith: '.com' } }, { name: { equals: 'Admin' } }],
        };

        SchemaTestUtils.testValidData(UserWhereInputObjectSchema, validData);
      });
    });

    describe('StringFilterObjectSchema', () => {
      it('should validate string filter operations', () => {
        const tests = [
          {
            value: { equals: 'test' },
            shouldPass: true,
            description: 'equals operation',
          },
          {
            value: { contains: 'test' },
            shouldPass: true,
            description: 'contains operation',
          },
          {
            value: { startsWith: 'test' },
            shouldPass: true,
            description: 'startsWith operation',
          },
          {
            value: { endsWith: 'test' },
            shouldPass: true,
            description: 'endsWith operation',
          },
          {
            value: { not: 'test' },
            shouldPass: true,
            description: 'not operation',
          },
          {
            value: { in: ['test1', 'test2'] },
            shouldPass: true,
            description: 'in operation',
          },
          {
            value: { notIn: ['test1', 'test2'] },
            shouldPass: true,
            description: 'notIn operation',
          },
          {
            value: { lt: 'test' },
            shouldPass: true,
            description: 'lt operation',
          },
          {
            value: { lte: 'test' },
            shouldPass: true,
            description: 'lte operation',
          },
          {
            value: { gt: 'test' },
            shouldPass: true,
            description: 'gt operation',
          },
          {
            value: { gte: 'test' },
            shouldPass: true,
            description: 'gte operation',
          },
          {
            value: { equals: 123 },
            shouldPass: false,
            description: 'non-string value should fail',
          },
        ];

        SchemaTestUtils.testBoundaryValues(StringFilterObjectSchema, tests);
      });
    });
  });

  describe('Type Safety Tests', () => {
    it('should have correct TypeScript types for UserFindManySchema', () => {
      SchemaTestUtils.testTypeInference(UserFindManySchema);
    });

    it('should have correct TypeScript types for UserCreateInputObjectSchema', () => {
      SchemaTestUtils.testTypeInference(UserCreateInputObjectSchema);
    });
  });

  describe('Performance Tests', () => {
    it('should perform validation efficiently', () => {
      const testData = {
        where: { email: 'test@example.com' },
        take: 10,
        skip: 0,
      };

      const performance = SchemaTestUtils.performanceTest(UserFindManySchema, testData, 100);

      expect(performance.avgTime).toBeLessThan(1); // Should validate in less than 1ms on average
      console.log(`Average validation time: ${performance.avgTime.toFixed(3)}ms`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested object validation', () => {
      const validData = {
        where: {
          AND: [
            {
              email: {
                contains: 'test',
              },
            },
            {
              posts: {
                some: {
                  title: {
                    startsWith: 'Important',
                  },
                },
              },
            },
          ],
        },
      };

      SchemaTestUtils.testValidData(UserFindManySchema, validData);
    });

    it('should handle complex array operations', () => {
      const validData = {
        distinct: ['id', 'email', 'name'] as ('id' | 'email' | 'name')[],
        orderBy: [{ id: 'desc' as const }, { email: 'asc' as const }],
      };

      SchemaTestUtils.testValidData(UserFindManySchema, validData);
    });

    it('should reject malformed data', () => {
      const invalidData = {
        where: {
          email: {
            invalidOperation: 'test',
          },
        },
      };

      SchemaTestUtils.testInvalidData(UserFindManySchema, invalidData);
    });
  });
});
