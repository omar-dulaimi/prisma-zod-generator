import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';
import { globSync } from 'glob';

/**
 * Issues #390 / #379: NodeNext moduleResolution and Node native TypeScript both
 * require explicit file extensions on relative ESM imports. The generator
 * honors the prisma-client generator block's own knobs (moduleFormat = "esm" +
 * importFileExtension) for every relative import it emits — no zod-side
 * configuration needed. These tests pin that property.
 */
describe('Issue #390/#379: import extensions follow prisma-client generator knobs', () => {
  const relativeImportRe = /from\s+'(\.[^']*)'/g;

  async function generateWithExtension(envName: string, ext: 'js' | 'ts') {
    const testEnv = await TestEnvironment.createTestEnv(envName);
    const config = ConfigGenerator.createBasicConfig();
    const configPath = join(testEnv.testDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    const schema = `
generator client {
  provider            = "prisma-client"
  output              = "./generated/client"
  moduleFormat        = "esm"
  importFileExtension = "${ext}"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  author   User @relation(fields: [authorId], references: [id])
  authorId Int
}
`;
    writeFileSync(testEnv.schemaPath, schema);
    await testEnv.runGeneration();
    return testEnv;
  }

  for (const ext of ['js', 'ts'] as const) {
    it(
      `emits .${ext} on every relative import when importFileExtension = "${ext}"`,
      async () => {
        const testEnv = await generateWithExtension(`issue-390-ext-${ext}`, ext);

        try {
          const files = globSync(join(testEnv.outputDir, 'schemas', '**', '*.ts'));
          expect(files.length).toBeGreaterThan(10);

          const offenders: string[] = [];
          for (const file of files) {
            const content = readFileSync(file, 'utf-8');
            for (const match of content.matchAll(relativeImportRe)) {
              if (!match[1].endsWith(`.${ext}`)) {
                offenders.push(`${file}: ${match[1]}`);
              }
            }
          }
          expect(offenders).toEqual([]);

          // The Prisma type import must point at a real generated entry file
          const findMany = readFileSync(
            globSync(join(testEnv.outputDir, 'schemas', 'findManyUser.schema.ts'))[0],
            'utf-8',
          );
          expect(findMany).toMatch(new RegExp(`from '[^']*client/(browser|client)\\.${ext}'`));
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  }
});
