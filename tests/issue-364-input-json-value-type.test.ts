import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { TestEnvironment, PrismaSchemaGenerator, GENERATION_TIMEOUT } from './helpers';

describe('Issue #364 — InputJsonValue type alias matches runtime schema and Prisma', () => {
  let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;
  let helpersContent = '';
  let helpersPath = '';

  beforeAll(async () => {
    testEnv = await TestEnvironment.createTestEnv('issue-364-input-json-value');

    const schemaWithJson = PrismaSchemaGenerator.createBasicSchema({
      models: ['User', 'Post'],
      outputPath: `${testEnv?.outputDir}/schemas`,
    }).concat(`

model JsonHolder {
  id      Int   @id @default(autoincrement())
  payload Json
  meta    Json?
}
`);

    if (testEnv) {
      await fs.writeFile(testEnv.schemaPath, schemaWithJson, 'utf8');
      await testEnv.runGeneration();
      helpersPath = join(testEnv.outputDir, 'schemas', 'helpers', 'json-helpers.ts');
      helpersContent = await fs.readFile(helpersPath, 'utf8');
    }
  }, GENERATION_TIMEOUT);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it('emits an InputJsonValue alias without top-level null', () => {
    // New alias excludes null at the top level, mirroring Prisma.InputJsonValue
    expect(helpersContent).toMatch(/export type InputJsonValue =\s*Exclude<JsonPrimitive, null>/);
    expect(helpersContent).toContain('Array<InputJsonValue | null>');
    expect(helpersContent).toContain('{ [k: string]: InputJsonValue | null }');
  });

  it('does not emit the old alias that admitted top-level null', () => {
    expect(helpersContent).not.toMatch(/export type InputJsonValue = JsonPrimitive \|/);
  });

  it('keeps the InputJsonValueSchema union without a top-level z.literal(null)', () => {
    // The runtime schema was already correct: null only inside record/array branches
    expect(helpersContent).toContain('z.string(), z.number(), z.boolean(),\n    z.record(');
    const inputSchemaBlock = helpersContent.slice(
      helpersContent.indexOf('export const InputJsonValueSchema'),
      helpersContent.indexOf('export const NullableJsonValue'),
    );
    // z.literal(null) must appear only inside the nested record/array unions
    expect(inputSchemaBlock).not.toMatch(/z\.union\(\[\s*z\.string\(\)[^[]*z\.literal\(null\)/);
  });

  it('runtime behavior is unchanged: rejects top-level null, accepts nested nulls', async () => {
    const mod = await import(pathToFileURL(helpersPath).href);

    expect(mod.InputJsonValueSchema.safeParse(null).success).toBe(false);
    expect(mod.InputJsonValueSchema.safeParse({ a: null }).success).toBe(true);
    expect(mod.InputJsonValueSchema.safeParse([null]).success).toBe(true);
    expect(mod.InputJsonValueSchema.safeParse('x').success).toBe(true);
    expect(mod.InputJsonValueSchema.safeParse(42).success).toBe(true);
    expect(mod.InputJsonValueSchema.safeParse({ nested: { deep: [1, null, 'a'] } }).success).toBe(
      true,
    );
  });
});
