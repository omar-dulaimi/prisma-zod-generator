import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Issue #387 — select schemas accept nested relation args', () => {
  let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;

  beforeAll(async () => {
    testEnv = await TestEnvironment.createTestEnv('issue-387-select-relation-args');

    const config = {
      ...ConfigGenerator.createBasicConfig(),
      addSelectType: true,
      addIncludeType: true,
    };
    const configPath = join(testEnv.testDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "${testEnv.outputDir}/client"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Form {
  id      String   @id @default(uuid())
  name    String
  layouts Layout[]
}

model Layout {
  id     String @id @default(uuid())
  formId String
  form   Form   @relation(fields: [formId], references: [id])
}

model Category {
  id       String     @id @default(uuid())
  parentId String?
  parent   Category?  @relation("CatTree", fields: [parentId], references: [id])
  children Category[] @relation("CatTree")
}
`;

    writeFileSync(testEnv.schemaPath, schema.trimStart());
    await testEnv.runGeneration();
  }, GENERATION_TIMEOUT);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  const layoutsUnion =
    'layouts: z.union([z.boolean(), z.lazy(() => LayoutFindManySchema)]).optional()';
  const countUnion =
    '_count: z.union([z.boolean(), z.lazy(() => FormCountOutputTypeArgsObjectSchema)]).optional()';

  it('emits relation and _count unions in the inline FindMany select schema', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    const content = readFileSync(
      join(testEnv.outputDir, 'schemas', 'findManyForm.schema.ts'),
      'utf-8',
    );

    // Both dual exports (typed + zod) must carry the union
    const layoutsMatches = content.split(layoutsUnion).length - 1;
    const countMatches = content.split(countUnion).length - 1;
    expect(layoutsMatches).toBe(2);
    expect(countMatches).toBe(2);
    expect(content).toContain("from './findManyLayout.schema'");
    expect(content).toContain("from './objects/FormCountOutputTypeArgs.schema'");
  });

  it('emits the same unions in FindFirst and FindFirstOrThrow select schemas', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    for (const file of ['findFirstForm.schema.ts', 'findFirstOrThrowForm.schema.ts']) {
      const content = readFileSync(join(testEnv.outputDir, 'schemas', file), 'utf-8');
      expect(content).toContain(layoutsUnion);
      expect(content).toContain(countUnion);
      expect(content).toContain("from './findManyLayout.schema'");
    }
  });

  it('emits singular relations as boolean-or-Args unions', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    const content = readFileSync(
      join(testEnv.outputDir, 'schemas', 'findManyLayout.schema.ts'),
      'utf-8',
    );
    expect(content).toContain(
      'form: z.union([z.boolean(), z.lazy(() => FormArgsObjectSchema)]).optional()',
    );
    expect(content).toContain("from './objects/FormArgs.schema'");
  });

  it('references self list relations locally without a self-import', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    const content = readFileSync(
      join(testEnv.outputDir, 'schemas', 'findManyCategory.schema.ts'),
      'utf-8',
    );
    expect(content).toContain(
      'children: z.union([z.boolean(), z.lazy(() => CategoryFindManySchema)]).optional()',
    );
    expect(content).not.toContain("from './findManyCategory.schema'");
  });

  it('accepts nested relation args at runtime (issue payload) while keeping strictness', async () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    const schemasDir = join(testEnv.outputDir, 'schemas');
    const { FormFindManySchema } = await import(join(schemasDir, 'findManyForm.schema.ts'));
    const { LayoutFindManySchema } = await import(join(schemasDir, 'findManyLayout.schema.ts'));
    const { CategoryFindManySchema } = await import(join(schemasDir, 'findManyCategory.schema.ts'));

    // The exact shape reported in issue #387
    expect(
      FormFindManySchema.safeParse({
        select: {
          id: true,
          layouts: {
            select: { id: true, formId: true },
            where: { formId: { equals: 'x' } },
            orderBy: { id: 'asc' },
            take: 5,
          },
        },
      }).success,
    ).toBe(true);

    // Deep nesting Form -> layouts -> form
    expect(
      FormFindManySchema.safeParse({
        select: { layouts: { select: { form: { select: { id: true } } } } },
      }).success,
    ).toBe(true);

    // _count with nested where
    expect(
      FormFindManySchema.safeParse({
        select: { _count: { select: { layouts: { where: { formId: { equals: 'x' } } } } } },
      }).success,
    ).toBe(true);

    // Plain booleans still accepted
    expect(
      FormFindManySchema.safeParse({ select: { id: true, layouts: false, _count: true } }).success,
    ).toBe(true);

    // Invalid values still rejected
    expect(FormFindManySchema.safeParse({ select: { layouts: 5 } }).success).toBe(false);
    expect(FormFindManySchema.safeParse({ select: { layouts: { bogus: 1 } } }).success).toBe(false);

    // Singular relation accepts nested select/include args
    expect(
      LayoutFindManySchema.safeParse({
        select: { form: { select: { id: true }, include: { layouts: true } } },
      }).success,
    ).toBe(true);

    // Self relation accepts nested args
    expect(CategoryFindManySchema.safeParse({ select: { children: { take: 1 } } }).success).toBe(
      true,
    );
  });
});
