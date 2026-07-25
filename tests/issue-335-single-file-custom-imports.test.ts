import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #335: in single-file mode, external imports declared via @zod.import
 * (e.g. custom validator modules referenced by @zod.custom.use) were stripped
 * along with internal schema imports and never hoisted into the bundle, leaving
 * the custom references undefined. They must be preserved at the top of the
 * bundle exactly once, without duplicating the Prisma import.
 */
describe('Issue #335: @zod.import custom imports hoisted in single-file mode', () => {
  it(
    'hoists the external custom import into the bundle and references it',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-335-single-file-custom-import');
      const config = { ...ConfigGenerator.createBasicConfig(), useMultipleFiles: false };
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
  id        String @id @default(uuid())
  email     String @unique
  metadata  Json   /// @zod.import(["import * as customTypes from '../custom-validators'"]).custom.use(customTypes.userMetadata)
}
`;
      writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
      writeFileSync(testEnv.schemaPath, schema);
      await testEnv.runGeneration();

      const bundlePath = join(testEnv.outputDir, 'schemas', 'schemas.ts');
      const bundle = readFileSync(bundlePath, 'utf-8');

      // The custom import is hoisted exactly once
      const customImports = bundle.match(/^import \* as customTypes from '[^']+';$/gm) ?? [];
      expect(customImports.length).toBe(1);

      // Its symbol is actually referenced in the bundle
      expect(bundle).toContain('customTypes.userMetadata');

      // Regression guard: exactly one Prisma type import (no per-depth duplicates)
      const prismaTypeImports = bundle.match(/^import type \{ Prisma \} from '[^']+';$/gm) ?? [];
      expect(prismaTypeImports.length).toBeLessThanOrEqual(1);

      // The custom import must appear before its first use
      const importIdx = bundle.indexOf('import * as customTypes');
      const useIdx = bundle.indexOf('customTypes.userMetadata');
      expect(importIdx).toBeGreaterThanOrEqual(0);
      expect(importIdx).toBeLessThan(useIdx);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'still strips internal schema imports (no ./objects or ./enums imports leak into the bundle)',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-335-single-file-internal');
      const config = { ...ConfigGenerator.createBasicConfig(), useMultipleFiles: false };
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

model Post {
  id    String @id @default(uuid())
  title String
}
`;
      writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
      writeFileSync(testEnv.schemaPath, schema);
      await testEnv.runGeneration();

      const bundle = readFileSync(join(testEnv.outputDir, 'schemas', 'schemas.ts'), 'utf-8');
      // Internal cross-file schema imports must not survive inlining
      expect(bundle).not.toMatch(/^import .* from '\.\.?\/(objects|enums|results|models)\//m);
    },
    GENERATION_TIMEOUT,
  );
});
