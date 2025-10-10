import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Pure models recursion with Zod v4 getters', () => {
  it(
    'emits getter-based relation fields when zodImportTarget=v4',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('pure-models-v4-getters');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: true,
          pureModelsIncludeRelations: true,
          zodImportTarget: 'v4' as const,
        };
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
  config   = "./config.json"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User?  @relation(fields: [authorId], references: [id])
  authorId Int?
}
`;
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
        const userModelPath = join(modelsDir, 'User.schema.ts');
        const postModelPath = join(modelsDir, 'Post.schema.ts');

        expect(existsSync(userModelPath)).toBe(true);
        expect(existsSync(postModelPath)).toBe(true);

        if (existsSync(userModelPath)) {
          const content = readFileSync(userModelPath, 'utf-8');
          expect(content).toContain("import * as z from 'zod/v4'");
          expect(content).toContain('get posts():');
          expect(content).not.toMatch(/z\.lazy\s*\(/);
        }
        if (existsSync(postModelPath)) {
          const content = readFileSync(postModelPath, 'utf-8');
          expect(content).toContain("import * as z from 'zod/v4'");
          expect(content).toContain('get author():');
          expect(content).not.toMatch(/z\.lazy\s*\(/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
