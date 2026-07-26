import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

type Parser = { safeParse: (value: unknown) => { success: boolean } };

/**
 * Does the emitted validator actually validate?
 *
 * Almost everything else in this suite answers a different question. The compile checks prove the
 * output type-checks; the coverage sweep proves ~900 schemas import and reject a primitive. Neither
 * runs a realistic payload through a generated schema and checks that the right things are accepted
 * and the wrong things refused — which is the only thing a consumer actually depends on.
 *
 * The sweep cannot do it: it walks every generated file without knowing any of their shapes, which
 * is exactly why its assertions had drifted into `expect(typeof result.success).toBe('boolean')`.
 * This works against one known schema instead, so every expectation here is specific.
 */
describe('generated schemas at runtime', () => {
  const root = join(process.cwd(), `test-env-runtime-${process.pid}`);

  const SCHEMA = `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  age       Int?
  role      Role     @default(MEMBER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
`;

  const objects = () => join(root, 'generated', 'schemas', 'objects');
  const schemas: Record<string, Parser> = {};

  beforeAll(async () => {
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'schema.prisma'), SCHEMA);
    prismaGenerateSync(join(root, 'schema.prisma'), process.cwd());

    const load = async (file: string, exportName: string) => {
      const mod = (await import(join(objects(), file))) as Record<string, Parser>;
      schemas[exportName] = mod[exportName];
      expect(schemas[exportName], `${exportName} missing from ${file}`).toBeDefined();
    };

    await load('UserCreateInput.schema.ts', 'UserCreateInputObjectSchema');
    await load('UserWhereInput.schema.ts', 'UserWhereInputObjectSchema');
    await load('UserUpdateInput.schema.ts', 'UserUpdateInputObjectSchema');
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const valid = { email: 'someone@example.com' };

  describe('create input', () => {
    it('accepts a payload with only the required field', () => {
      // Everything else on this model is optional or defaulted, so this is the minimum a
      // consumer must supply.
      expect(schemas.UserCreateInputObjectSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects a payload missing the required field', () => {
      expect(schemas.UserCreateInputObjectSchema.safeParse({ name: 'no email' }).success).toBe(
        false,
      );
    });

    it('rejects a field of the wrong type', () => {
      for (const bad of [
        { ...valid, email: 42 },
        { ...valid, age: 'not a number' },
        { ...valid, isActive: 'yes' },
      ])
        expect(
          schemas.UserCreateInputObjectSchema.safeParse(bad).success,
          JSON.stringify(bad),
        ).toBe(false);
    });

    it('rejects a value outside the enum', () => {
      expect(
        schemas.UserCreateInputObjectSchema.safeParse({ ...valid, role: 'SUPERUSER' }).success,
      ).toBe(false);
      expect(
        schemas.UserCreateInputObjectSchema.safeParse({ ...valid, role: 'ADMIN' }).success,
      ).toBe(true);
    });

    it('accepts null for a nullable column and rejects it for a required one', () => {
      // `name String?` is nullable; `email String` is not. Getting this backwards would let a
      // consumer write null into a NOT NULL column and be told it was fine.
      expect(
        schemas.UserCreateInputObjectSchema.safeParse({ ...valid, name: null }).success,
      ).toBe(true);
      expect(schemas.UserCreateInputObjectSchema.safeParse({ email: null }).success).toBe(false);
    });

    it('accepts a DateTime as an ISO string, since JSON clients send strings', () => {
      // Input schemas use z.coerce.date() by default — see config/datetime-strategy.md.
      expect(
        schemas.UserCreateInputObjectSchema.safeParse({
          ...valid,
          createdAt: '2026-01-01T00:00:00.000Z',
        }).success,
      ).toBe(true);
      expect(
        schemas.UserCreateInputObjectSchema.safeParse({ ...valid, createdAt: 'not a date' })
          .success,
      ).toBe(false);
    });
  });

  describe('where input', () => {
    it('accepts an empty filter', () => {
      expect(schemas.UserWhereInputObjectSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a scalar equality filter and a nested operator', () => {
      expect(
        schemas.UserWhereInputObjectSchema.safeParse({ email: 'someone@example.com' }).success,
      ).toBe(true);
      expect(
        schemas.UserWhereInputObjectSchema.safeParse({ email: { contains: 'example' } }).success,
      ).toBe(true);
    });

    it('rejects an operator that does not exist', () => {
      expect(
        schemas.UserWhereInputObjectSchema.safeParse({ email: { notAnOperator: 'x' } }).success,
      ).toBe(false);
    });

    it('accepts the logical combinators', () => {
      expect(
        schemas.UserWhereInputObjectSchema.safeParse({
          AND: [{ email: 'a@b.c' }, { role: 'OWNER' }],
        }).success,
      ).toBe(true);
    });
  });

  describe('update input', () => {
    it('accepts a partial payload, because updates are partial', () => {
      expect(schemas.UserUpdateInputObjectSchema.safeParse({ name: 'new name' }).success).toBe(
        true,
      );
      expect(schemas.UserUpdateInputObjectSchema.safeParse({}).success).toBe(true);
    });

    it('accepts an atomic operation wrapper on a numeric column', () => {
      expect(schemas.UserUpdateInputObjectSchema.safeParse({ age: { increment: 1 } }).success).toBe(
        true,
      );
    });

    it('still enforces types on the fields it is given', () => {
      expect(schemas.UserUpdateInputObjectSchema.safeParse({ age: 'older' }).success).toBe(false);
    });
  });
});
