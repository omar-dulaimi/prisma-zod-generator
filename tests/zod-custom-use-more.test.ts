import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('@zod.custom.use common patterns', () => {
  it(
    'handles union, record, optional field, and multiline override',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-custom-use-more');
      try {
        const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true };
        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model CustomExamples {
  id        Int   @id @default(autoincrement())
  /// @zod.custom.use(z.record(z.string()))
  settings  Json  @default("{}")
  /// @zod.custom.use(z.union([z.string(), z.number(), z.boolean()]))
  payload2  Json? // optional field -> expect .optional()
  /// @zod.custom.use(z.array(z.object({ a: z.string(), b: z.number().optional() })))
  items     Json  @default("[]")
  /// @zod.custom.use(z.tuple([z.string(), z.number()]))
  tupleVal  Json
  /** Multiline custom override example
   * @zod.custom.use(z.union([
   *   z.object({ type: z.literal("a"), a: z.string() }),
   *   z.object({ type: z.literal("b"), b: z.number() })
   * ]))
   */
  event     Json
}
`;
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        const modelFile = join(testEnv.outputDir, 'schemas', 'models', 'CustomExamples.schema.ts');
        expect(existsSync(modelFile)).toBe(true);
        const content = readFileSync(modelFile, 'utf-8');

        // settings: record override present with default
        expect(content).toMatch(/settings: z\.record\(z\.string\(\)\)\.default\("\{\}"\)/);
        // payload2: union override plus .optional()
        expect(content).toMatch(
          /payload2: z\.union\(\[z\.string\(\), z\.number\(\), z\.boolean\(\)\]\)\.optional\(\)/,
        );
        // items: array of object override with default
        expect(content).toMatch(
          /items: z\.array\(z\.object\(\{ a: z\.string\(\), b: z\.number\(\)\.optional\(\) \}\)\)\.default\("\[\]"\)/,
        );
        // tupleVal: tuple override
        expect(content).toMatch(/tupleVal: z\.tuple\(\[z\.string\(\), z\.number\(\)\]\)/);
        // event: multiline union override collapsed (should include both object variants)
        expect(content).toMatch(
          /event: z\.union\(\[.*type: z\.literal\("a"\).*type: z\.literal\("b"\).*\]/s,
        );
        // Ensure none of these custom overrides pulled in depth helper
        expect(content).not.toMatch(/getDepth/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
