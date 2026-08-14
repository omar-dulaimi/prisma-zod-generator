import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

/**
 * `@zod.coerce()` on Int/Float/BigInt/Boolean fields. Zod has no `.coerce()` chain
 * method — coercion only exists as a constructor variant (`z.coerce.number()`, never
 * `z.number().coerce()`) — so this replaces the base type, the same mechanism
 * `@zod.json()`/`@zod.enum()` already use, rather than appending to the chain.
 */
describe('@zod.coerce()', () => {
  const root = join(process.cwd(), `test-env-zod-coerce-${process.pid}`);
  const objectsDir = join(root, 'generated', 'schemas', 'objects');
  const scalarsPath = join(objectsDir, 'CoerceScalarsCreateInput.schema.ts');
  const wrongTypePath = join(objectsDir, 'CoerceWrongTypeCreateInput.schema.ts');
  const listPath = join(objectsDir, 'CoerceListCreateInput.schema.ts');
  let scalars = '';
  let wrongType = '';
  let list = '';

  beforeAll(() => {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'schema.prisma'),
      `datasource db {
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

model CoerceScalars {
  id     Int     @id @default(autoincrement())
  count  Int     /// @zod.coerce().min(1)
  ratio  Float   /// @zod.coerce()
  big    BigInt  /// @zod.coerce()
  active Boolean /// @zod.coerce()
}

model CoerceWrongType {
  id   Int    @id @default(autoincrement())
  /// @zod.coerce()
  name String
}

model CoerceList {
  id     Int   @id @default(autoincrement())
  /// @zod.coerce()
  scores Int[]
}
`,
    );

    prismaGenerateSync(join(root, 'schema.prisma'), process.cwd());
    scalars = readFileSync(scalarsPath, 'utf-8');
    wrongType = readFileSync(wrongTypePath, 'utf-8');
    list = readFileSync(listPath, 'utf-8');
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('coerces Int, keeping .int() and the rest of the chain', () => {
    expect(scalars).toContain('z.coerce.number().int().min(1)');
  });

  it('coerces Float without .int()', () => {
    expect(scalars).toMatch(/ratio:\s*z\.coerce\.number\(\)(?!\.int\(\))/);
  });

  it('coerces BigInt', () => {
    expect(scalars).toContain('z.coerce.bigint()');
  });

  it('coerces Boolean', () => {
    expect(scalars).toContain('z.coerce.boolean()');
  });

  it('rejects @zod.coerce() on String instead of emitting z.coerce.string()', () => {
    // Falls back per field, same as any other type-incompatible validator — see
    // invalid-zod-annotations.test.ts. Not a hard error for the whole run.
    expect(existsSync(wrongTypePath)).toBe(true);
    expect(wrongType).not.toContain('z.coerce.string()');
    expect(wrongType).toContain('z.string()');
  });

  it('rejects @zod.coerce() on a list field instead of silently doing nothing', () => {
    // effectiveFieldType becomes 'Array' for list fields, so this goes through the
    // same fieldTypeCompatibility check as CoerceWrongType above, not a separate path.
    expect(existsSync(listPath)).toBe(true);
    expect(list).not.toContain('z.coerce');
  });
});
