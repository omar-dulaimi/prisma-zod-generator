import { writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, TestEnvironment, GENERATION_TIMEOUT } from './helpers';

/**
 * Runtime behavior tests for the inputCoercion generator option.
 *
 * Earlier revisions of this test only text-matched the emitted source, so a
 * `z.coerce.boolean()` regression could sail straight through. These tests
 * generate the schemas and then parse realistic payloads through them — the
 * exact cases that motivated the option (HTTP query params arrive as strings).
 *
 * Scope: only DMMF input types (everything under `objects/`, i.e. filters and
 * where/create/update inputs) and the `take`/`skip` fields in `*Args`
 * pagination schemas are coerced; `variants/input` is coerced and
 * `variants/result` + `variants/pure` + `models/` stay strict, because a value
 * Prisma already produced never needs coercing and coercing widens `z.input` to
 * `unknown` for nothing.
 */
describe('inputCoercion at runtime', () => {
  let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>>;
  let UserWhere: { safeParse: (v: unknown) => { success: boolean; data: unknown } };
  let UserCreate: { safeParse: (v: unknown) => { success: boolean; data: unknown } };
  let UserInclude: { safeParse: (v: unknown) => { success: boolean; data: unknown } };
  let UserFindMany: { safeParse: (v: unknown) => { success: boolean; data: unknown } };
  let UserCount: { safeParse: (v: unknown) => { success: boolean; data: unknown } };
  let UserInputVariant: { safeParse: (v: unknown) => { success: boolean; data: unknown } };
  let UserResultVariant: { safeParse: (v: unknown) => { success: boolean; data: unknown } };

  const SCHEMA = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated/schemas"
  config   = "./config.json"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  /// @zod.min(1)
  age       Int?
  score     Float?
  verified  Boolean
  balance   Decimal?
  clicks    BigInt?
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  published Boolean?
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}
`;

  const config = {
    ...ConfigGenerator.createBasicConfig(),
    inputCoercion: true,
    addSelectType: true,
    addIncludeType: true,
  };

  const base = { email: 'a@b.c', verified: true };

  async function load<T>(rel: string, name: string): Promise<T> {
    const abs = join(testEnv.outputDir, rel);
    const mod = (await import(/* @vite-ignore */ abs)) as Record<string, T>;
    const found = mod[name];
    expect(found, `${name} should be exported by ${rel}`).toBeDefined();
    return found;
  }

  beforeAll(async () => {
    testEnv = await TestEnvironment.createTestEnv('input-coercion-runtime');
    writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
    writeFileSync(testEnv.schemaPath, SCHEMA);
    await testEnv.runGeneration();

    UserWhere = await load<typeof UserWhere>(
      'schemas/objects/UserWhereInput.schema.ts',
      'UserWhereInputObjectSchema',
    );
    UserCreate = await load<typeof UserCreate>(
      'schemas/objects/UserCreateInput.schema.ts',
      'UserCreateInputObjectSchema',
    );
    UserInclude = await load<typeof UserInclude>(
      'schemas/objects/UserInclude.schema.ts',
      'UserIncludeObjectSchema',
    );
    UserFindMany = await load<typeof UserFindMany>(
      'schemas/findManyUser.schema.ts',
      'UserFindManyZodSchema',
    );
    UserCount = await load<typeof UserCount>('schemas/countUser.schema.ts', 'UserCountZodSchema');
    UserInputVariant = await load<typeof UserInputVariant>(
      'schemas/variants/input/User.input.ts',
      'UserInputSchema',
    );
    UserResultVariant = await load<typeof UserResultVariant>(
      'schemas/variants/result/User.result.ts',
      'UserResultSchema',
    );
  }, GENERATION_TIMEOUT);

  afterAll(() => testEnv.cleanup());

  describe('boolean coercion', () => {
    it("treats 'false' as false and 'true' as true, not Boolean('false')===true", () => {
      // where input scalar form
      expect(UserWhere.safeParse({ verified: 'false' }).success).toBe(true);
      expect(UserWhere.safeParse({ verified: 'true' }).success).toBe(true);
      // where input filter form
      expect(UserWhere.safeParse({ verified: { equals: 'false' } }).success).toBe(true);
      expect(UserWhere.safeParse({ verified: { not: { equals: false } } }).success).toBe(true);
      // and real booleans still pass
      expect(UserWhere.safeParse({ verified: false }).success).toBe(true);
      expect(UserWhere.safeParse({ verified: { equals: false } }).success).toBe(true);
    });

    it("rejects strings that are neither 'true'/'false' nor the stringbool forms", () => {
      expect(UserWhere.safeParse({ verified: 'nope' }).success).toBe(false);
      expect(UserWhere.safeParse({ verified: 'abc' }).success).toBe(false);
      expect(UserWhere.safeParse({ verified: { equals: '' } }).success).toBe(false);
    });

    it("does not classify '' as false", () => {
      const result = UserWhere.safeParse({ verified: { equals: '' } });
      expect(result.success).toBe(false);
    });
  });

  describe('numeric coercion', () => {
    it('coerces numeric strings on filter fields', () => {
      expect(UserWhere.safeParse({ age: '30' }).success).toBe(true);
      expect(UserWhere.safeParse({ age: { gte: '10', lte: '20' } }).success).toBe(true);
      expect(UserWhere.safeParse({ score: '9.5' }).success).toBe(true);
      expect(UserWhere.safeParse({ clicks: '123' }).success).toBe(true);
    });

    it('keeps @zod annotations composing on aptly coerced fields', () => {
      // age carries /// @zod.min(1); the annotation must chain onto the coerced
      // base (z.coerce.number().int().min(1)) rather than the strict default.
      expect(UserWhere.safeParse({ age: '0' }).success).toBe(false); // below min
      expect(UserWhere.safeParse({ age: '30' }).success).toBe(true);
    });

    it('rejects non-numeric strings', () => {
      expect(UserWhere.safeParse({ age: 'abc' }).success).toBe(false);
    });
  });

  describe('create input', () => {
    it('rejects a payload with the required Boolean omitted', () => {
      // Boolean(undefined) is false, so z.coerce.boolean() would accept this;
      // the union form must not.
      const { email } = base;
      expect(UserCreate.safeParse({ email }).success).toBe(false);
    });

    it('accepts a real boolean and a "false" string for a required Boolean', () => {
      expect(UserCreate.safeParse({ ...base, verified: true }).success).toBe(true);
      expect(UserCreate.safeParse({ ...base, verified: 'false' }).success).toBe(true);
    });

    it('rejects an invalid boolean string', () => {
      expect(UserCreate.safeParse({ ...base, verified: 'nope' }).success).toBe(false);
    });

    it('coerces numeric strings in create input', () => {
      expect(UserCreate.safeParse({ ...base, age: '31', score: '8.5' }).success).toBe(true);
      expect(UserCreate.safeParse({ ...base, clicks: '42' }).success).toBe(true);
    });
  });

  describe('include schema', () => {
    it('keeps nested objects intact instead of flattening them to true', () => {
      // z.coerce.boolean() (i.e. Boolean(x)) on a nested include would turn
      // { posts: { where: ... } } into { posts: true }; the union form must not.
      const result = UserInclude.safeParse({ posts: { where: { published: true } } });
      expect(result.success).toBe(true);
      expect((result.data as { posts: { where: { published: true } } }).posts.where.published).toBe(
        true,
      );
    });
  });

  describe('take/skip pagination', () => {
    it('coerces take/skip in FindMany args', () => {
      expect(UserFindMany.safeParse({ take: '10', skip: '5' }).success).toBe(true);
      expect(UserFindMany.safeParse({ take: 10, skip: 5 }).success).toBe(true);
    });

    it('coerces take/skip in Count args', () => {
      expect(UserCount.safeParse({ take: '10', skip: '5' }).success).toBe(true);
    });
  });

  describe('variants', () => {
    // The variant schemas carry the model's full shape — including required
    // fields — so these payloads need the complete record, not just the
    // coerced fields under test.
    const inputPayload = {
      id: 1,
      email: 'a@b.c',
      age: '30',
      score: '9.5',
      balance: '10.5',
      verified: 'true',
      clicks: '42',
      createdAt: '2026-01-01T00:00:00.000Z',
      posts: [],
    };
    const resultPayload = {
      id: 1,
      email: 'a@b.c',
      age: 30,
      score: 9.5,
      balance: 10.5,
      verified: true,
      clicks: 42n,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      posts: [],
    };

    it('input variant coerces numeric, boolean and date fields', () => {
      expect(UserInputVariant.safeParse(inputPayload).success).toBe(true);
    });

    it('result variant stays strict (no coercion)', () => {
      // Results come out of Prisma; coercing them widens z.input to unknown.
      expect(UserResultVariant.safeParse({ ...resultPayload, verified: 'true' }).success).toBe(
        false,
      );
      expect(UserResultVariant.safeParse(resultPayload).success).toBe(true);
    });
  });
});
