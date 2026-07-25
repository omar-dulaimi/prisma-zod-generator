import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #370: custom module path for the `z` import, so users can point z at
 * their own re-export (e.g. a Zod instance configured with an i18n error map).
 * The binding style still follows zodImportTarget; only the module path changes.
 */
describe('Issue #370: custom zodImportPath', () => {
  async function generate(
    envName: string,
    extra: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof TestEnvironment.createTestEnv>>> {
    const testEnv = await TestEnvironment.createTestEnv(envName);
    const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true, ...extra };
    const schema = `
generator client {
  provider = "prisma-client-js"
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
}
`;
    writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
    writeFileSync(testEnv.schemaPath, schema);
    await testEnv.runGeneration();
    return testEnv;
  }

  it(
    'rewrites the z import path across model and object schemas (auto target)',
    async () => {
      const testEnv = await generate('issue-370-auto', { zodImportPath: './lib/zod' });
      try {
        const model = readFileSync(
          join(testEnv.outputDir, 'schemas', 'models', 'User.schema.ts'),
          'utf-8',
        );
        const object = readFileSync(
          join(testEnv.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts'),
          'utf-8',
        );
        expect(model).toMatch(/^import \* as z from '\.\/lib\/zod';/m);
        expect(object).toMatch(/^import \* as z from '\.\/lib\/zod';/m);
        expect(model).not.toMatch(/from 'zod';/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'preserves the named binding style for the v3 target',
    async () => {
      const testEnv = await generate('issue-370-v3', {
        zodImportTarget: 'v3',
        zodImportPath: '@myorg/zod-i18n',
      });
      try {
        const model = readFileSync(
          join(testEnv.outputDir, 'schemas', 'models', 'User.schema.ts'),
          'utf-8',
        );
        expect(model).toMatch(/^import \{ z \} from '@myorg\/zod-i18n';/m);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'rewrites the z import in single-file mode',
    async () => {
      const testEnv = await generate('issue-370-single-file', {
        useMultipleFiles: false,
        pureModels: false,
        zodImportPath: './lib/zod',
      });
      try {
        const bundlePath = join(testEnv.outputDir, 'schemas', 'schemas.ts');
        const bundle = existsSync(bundlePath)
          ? readFileSync(bundlePath, 'utf-8')
          : readFileSync(join(testEnv.outputDir, 'schemas.ts'), 'utf-8');
        // Exactly one hoisted z import, pointing at the custom path
        const zImports = bundle.match(/^import (?:\* as z|\{ z \}) from '[^']*';/gm) ?? [];
        expect(zImports).toEqual(["import * as z from './lib/zod';"]);
        expect(bundle).toContain('z.object(');
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'falls back to the default path when zodImportPath is not a valid module specifier',
    async () => {
      const testEnv = await generate('issue-370-invalid', { zodImportPath: 'has spaces' });
      try {
        const model = readFileSync(
          join(testEnv.outputDir, 'schemas', 'models', 'User.schema.ts'),
          'utf-8',
        );
        expect(model).toMatch(/^import \* as z from 'zod';/m);
        expect(model).not.toMatch(/has spaces/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
