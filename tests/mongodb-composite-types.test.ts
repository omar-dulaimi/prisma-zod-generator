import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

/**
 * A MongoDB composite type (`type Address { ... }`) referenced by a model field has
 * the same DMMF `kind: 'object'` as a real relation, but Prisma never sets
 * `relationName` for one - composites aren't relations. CRUD/input/where schemas
 * already handled this correctly, because Prisma's own DMMF pre-expands composites
 * into ordinary `inputObjectTypes`/`outputObjectTypes` entries that the generic
 * object-schema walker picks up without any composite-specific code.
 *
 * The pure/result/input variant schemas build each field's expression directly from
 * `model.fields`, though, and had no case for "this object-kind field is a
 * composite" - it fell through to the same z.unknown() fallback used for a type the
 * generator genuinely doesn't recognize, silently, for every composite field, in
 * every variant.
 */
describe('MongoDB composite types in variant schemas', () => {
  const root = join(process.cwd(), `test-env-mongo-composite-${process.pid}`);
  const schemasDir = join(root, 'generated', 'schemas');
  let pure = '';
  let result = '';
  let input = '';
  let listPure = '';

  beforeAll(() => {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'schema.prisma'),
      `datasource db {
  provider = "mongodb"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

type Address {
  street String
  city   String
  zip    String?
}

model Customer {
  id      String    @id @default(auto()) @map("_id") @db.ObjectId
  name    String
  address Address
}

model Warehouse {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  addresses Address[]
}
`,
    );

    prismaGenerateSync(join(root, 'schema.prisma'), process.cwd());
    pure = readFileSync(join(schemasDir, 'variants', 'pure', 'Customer.pure.ts'), 'utf-8');
    result = readFileSync(join(schemasDir, 'variants', 'result', 'Customer.result.ts'), 'utf-8');
    input = readFileSync(join(schemasDir, 'variants', 'input', 'Customer.input.ts'), 'utf-8');
    listPure = readFileSync(join(schemasDir, 'variants', 'pure', 'Warehouse.pure.ts'), 'utf-8');
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('generates a full structural object schema for the composite type', () => {
    const compositeSchemaPath = join(schemasDir, 'objects', 'AddressObjectEqualityInput.schema.ts');
    expect(existsSync(compositeSchemaPath)).toBe(true);
    const content = readFileSync(compositeSchemaPath, 'utf-8');
    expect(content).toContain('street: z.string()');
    expect(content).toContain('city: z.string()');
    expect(content).toContain('zip: z.string().optional().nullable()');
  });

  it('references that schema from the pure variant instead of z.unknown()', () => {
    expect(pure).toContain(
      "import { AddressObjectEqualityInputObjectSchema } from '../../objects/AddressObjectEqualityInput.schema'",
    );
    expect(pure).toContain('address: AddressObjectEqualityInputObjectSchema');
    expect(pure).not.toContain('z.unknown()');
  });

  it('references that schema from the result variant', () => {
    expect(result).toContain('address: AddressObjectEqualityInputObjectSchema');
    expect(result).not.toContain('z.unknown()');
  });

  it('references that schema from the input variant', () => {
    expect(input).toContain('address: AddressObjectEqualityInputObjectSchema');
    expect(input).not.toContain('z.unknown()');
  });

  it('appends .array() for a list of composites', () => {
    expect(listPure).toContain('addresses: AddressObjectEqualityInputObjectSchema.array()');
    expect(listPure).not.toContain('z.unknown()');
  });
});
