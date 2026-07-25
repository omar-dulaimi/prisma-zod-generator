import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Regression coverage for issue #376.
 *
 * With result variants enabled, relation fields in the default record-shaped
 * result schemas used to always render as `z.array(z.unknown())` / `z.unknown()`
 * because the result generator's scalar type map has no entry for a related
 * model. This suite pins the corrected behavior:
 *
 *  - When the related model's pure schema is emitted (schemas/models/<Model>.schema.ts),
 *    relation fields reference it: `z.array(<Model>Schema).optional()` (list) or
 *    `<Model>Schema.optional()` (to-one), importing it from ../models.
 *  - Otherwise (no pure models, self-relation, or single-file bundle) they fall
 *    back to `z.array(z.unknown()).optional()` / `z.unknown().optional()`.
 *  - Relations are always optional (only present when the query `include`s them).
 *  - Scalar fields and aggregate/count/groupBy shapes are unchanged.
 */

// Video<->Tag is a many-to-many; Video.owner is a to-one relation; Node is a
// self-relation (parent/children). Status exercises a scalar enum (out of scope).
function buildSchema(outputDir: string): string {
  return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${outputDir}/schemas"
  config   = "./config.json"
}

enum Status {
  ACTIVE
  INACTIVE
}

model Video {
  id      Int    @id @default(autoincrement())
  path    String
  tags    Tag[]
  owner   User   @relation(fields: [ownerId], references: [id])
  ownerId Int
}

model Tag {
  id     Int     @id @default(autoincrement())
  name   String
  videos Video[]
}

model User {
  id     Int     @id @default(autoincrement())
  email  String  @unique
  status Status  @default(ACTIVE)
  videos Video[]
}

model Node {
  id       Int    @id @default(autoincrement())
  name     String
  parent   Node?  @relation("NodeChildren", fields: [parentId], references: [id])
  parentId Int?
  children Node[] @relation("NodeChildren")
}
`;
}

describe('issue #376 - typed + optional relation fields in result schemas', () => {
  it(
    'references pure model schemas for relations (m2m both sides, to-one) and imports them',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-376-pure-models');

      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: true,
          useMultipleFiles: true,
          variants: {
            pure: { enabled: true },
            input: { enabled: true },
            result: { enabled: true },
          },
        };

        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));

        await testEnv.runGeneration();

        const schemasDir = join(testEnv.outputDir, 'schemas');
        const resultsDir = join(schemasDir, 'results');
        const modelsDir = join(schemasDir, 'models');

        // Pure model schemas are emitted at schemas/models/<Model>.schema.ts.
        expect(existsSync(join(modelsDir, 'Tag.schema.ts'))).toBe(true);
        expect(existsSync(join(modelsDir, 'Video.schema.ts'))).toBe(true);
        expect(existsSync(join(modelsDir, 'User.schema.ts'))).toBe(true);

        // Video (findMany): list relation -> z.array(TagSchema).optional();
        // to-one relation -> UserSchema.optional(); scalars unchanged.
        const videoFindMany = readFileSync(
          join(resultsDir, 'VideoFindManyResult.schema.ts'),
          'utf-8',
        );
        expect(videoFindMany).toMatch(/tags:\s*z\.array\(TagSchema\)\.optional\(\)/);
        expect(videoFindMany).toMatch(/owner:\s*UserSchema\.optional\(\)/);
        expect(videoFindMany).toMatch(
          /import\s*\{\s*TagSchema\s*\}\s*from\s*'\.\.\/models\/Tag\.schema'/,
        );
        expect(videoFindMany).toMatch(
          /import\s*\{\s*UserSchema\s*\}\s*from\s*'\.\.\/models\/User\.schema'/,
        );
        // Scalars are untouched (required FK stays non-optional).
        expect(videoFindMany).toMatch(/path:\s*z\.string\(\)/);
        expect(videoFindMany).toMatch(/ownerId:\s*z\.number\(\)\.int\(\)(?!\.optional)/);
        // No z.unknown() leaked in for the referenced relations.
        expect(videoFindMany).not.toMatch(/tags:\s*z\.array\(z\.unknown\(\)\)/);

        // To-one relation also holds in a single-record operation (Create).
        const videoCreate = readFileSync(join(resultsDir, 'VideoCreateResult.schema.ts'), 'utf-8');
        expect(videoCreate).toMatch(/owner:\s*UserSchema\.optional\(\)/);
        expect(videoCreate).toMatch(/tags:\s*z\.array\(TagSchema\)\.optional\(\)/);

        // Symmetric side: Tag.videos -> z.array(VideoSchema).optional().
        const tagFindMany = readFileSync(join(resultsDir, 'TagFindManyResult.schema.ts'), 'utf-8');
        expect(tagFindMany).toMatch(/videos:\s*z\.array\(VideoSchema\)\.optional\(\)/);
        expect(tagFindMany).toMatch(
          /import\s*\{\s*VideoSchema\s*\}\s*from\s*'\.\.\/models\/Video\.schema'/,
        );

        // Self-relation: Node references neither itself as an import nor a schema.
        const nodeFindMany = readFileSync(
          join(resultsDir, 'NodeFindManyResult.schema.ts'),
          'utf-8',
        );
        expect(nodeFindMany).toMatch(/parent:\s*z\.unknown\(\)\.optional\(\)/);
        expect(nodeFindMany).toMatch(/children:\s*z\.array\(z\.unknown\(\)\)\.optional\(\)/);
        expect(nodeFindMany).not.toMatch(/models\/Node\.schema/);
        expect(nodeFindMany).not.toMatch(/NodeSchema/);

        // Aggregate/count shapes are unaffected by relation handling.
        const videoAggregate = readFileSync(
          join(resultsDir, 'VideoAggregateResult.schema.ts'),
          'utf-8',
        );
        expect(videoAggregate).toMatch(/_count/);
        expect(videoAggregate).not.toMatch(/TagSchema/);

        // Runtime: the generated result file imports cleanly and validates data.
        const videoFindManyPath = join(resultsDir, 'VideoFindManyResult.schema.ts');
        const mod = await import(pathToFileURL(videoFindManyPath).href);
        const parsed = mod.VideoFindManyResultSchema.safeParse({
          data: [
            {
              id: 1,
              path: '/a.mp4',
              ownerId: 7,
              tags: [{ id: 1, name: 'x' }],
              owner: { id: 7, email: 'a@b.c', status: 'ACTIVE' },
            },
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });
        expect(parsed.success).toBe(true);
        // Relations are optional: omitting them still validates.
        const parsedNoRelations = mod.VideoFindManyResultSchema.safeParse({
          data: [{ id: 1, path: '/a.mp4', ownerId: 7 }],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });
        expect(parsedNoRelations.success).toBe(true);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'falls back to optional z.unknown() when pure models are not generated',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-376-no-pure-models');

      try {
        // Result variants enabled, but NO pureModels -> no schemas/models/*.
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: false,
          useMultipleFiles: true,
          variants: { result: { enabled: true } },
        };

        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));

        await testEnv.runGeneration();

        const schemasDir = join(testEnv.outputDir, 'schemas');
        const resultsDir = join(schemasDir, 'results');

        // No pure model schemas were emitted.
        expect(existsSync(join(schemasDir, 'models'))).toBe(false);

        const videoFindMany = readFileSync(
          join(resultsDir, 'VideoFindManyResult.schema.ts'),
          'utf-8',
        );
        // Relations fall back to optional z.unknown(), and NEVER import a model.
        expect(videoFindMany).toMatch(/tags:\s*z\.array\(z\.unknown\(\)\)\.optional\(\)/);
        expect(videoFindMany).toMatch(/owner:\s*z\.unknown\(\)\.optional\(\)/);
        expect(videoFindMany).not.toMatch(/\.\.\/models\//);
        expect(videoFindMany).not.toMatch(/TagSchema|UserSchema/);
        // Scalars unchanged.
        expect(videoFindMany).toMatch(/path:\s*z\.string\(\)/);

        // Runtime: still a clean, functional schema.
        const mod = await import(
          pathToFileURL(join(resultsDir, 'VideoFindManyResult.schema.ts')).href
        );
        expect(
          mod.VideoFindManyResultSchema.safeParse({
            data: [{ id: 1, path: '/a.mp4', ownerId: 7 }],
            pagination: {
              page: 1,
              pageSize: 10,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          }).success,
        ).toBe(true);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'single-file mode inlines pure models but keeps relations on the safe z.unknown() fallback',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-376-single-file');

      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: true,
          useMultipleFiles: false,
          variants: {
            pure: { enabled: true },
            input: { enabled: true },
            result: { enabled: true },
          },
        };

        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));

        await testEnv.runGeneration();

        const bundlePath = join(testEnv.outputDir, 'schemas', 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);
        const bundle = readFileSync(bundlePath, 'utf-8');

        // Result schema and pure model schema are both inlined into the bundle.
        expect(bundle).toMatch(/export const VideoFindManyResultSchema = /);
        expect(bundle).toMatch(/export const TagSchema = /);

        // In the single bundle, result schemas are emitted before pure models, so
        // a forward reference would not resolve; relations use the safe fallback.
        expect(bundle).toMatch(/tags:\s*z\.array\(z\.unknown\(\)\)\.optional\(\)/);
        expect(bundle).toMatch(/owner:\s*z\.unknown\(\)\.optional\(\)/);
        // No result-schema relation field references a model schema in the bundle.
        expect(bundle).not.toMatch(/tags:\s*z\.array\(TagSchema\)/);
        expect(bundle).not.toMatch(/owner:\s*UserSchema/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
