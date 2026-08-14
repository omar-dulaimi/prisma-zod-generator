import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

/**
 * `PZG_SKIP=1` no-ops generation for e.g. a production build where schemas are
 * already committed and regenerating them is wasted CI time, not a no-op.
 * `prisma generate` itself still runs — this only skips this generator's turn.
 */
describe('PZG_SKIP', () => {
  const root = join(process.cwd(), `test-env-pzg-skip-${process.pid}`);
  const outputDir = join(root, 'generated');
  const schemaPath = join(root, 'schema.prisma');

  beforeAll(() => {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      schemaPath,
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

model Widget {
  id   String @id @default(cuid())
  name String
}
`,
    );
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    delete process.env.PZG_SKIP;
    rmSync(root, { recursive: true, force: true });
  });

  it(
    'generates as usual with PZG_SKIP unset',
    () => {
      delete process.env.PZG_SKIP;
      prismaGenerateSync(schemaPath, process.cwd());

      expect(existsSync(outputDir)).toBe(true);
      expect(readdirSync(outputDir).length).toBeGreaterThan(0);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'writes nothing when PZG_SKIP=1, leaving what is already on disk untouched',
    () => {
      // The previous test already populated outputDir; a sentinel file proves this
      // run neither wiped it first nor wrote into it, not just that *some* files
      // happen to still be present.
      const sentinel = join(outputDir, 'sentinel-from-test.txt');
      writeFileSync(sentinel, 'left alone');

      process.env.PZG_SKIP = '1';
      prismaGenerateSync(schemaPath, process.cwd());

      expect(existsSync(sentinel)).toBe(true);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'also accepts PZG_SKIP=true',
    () => {
      rmSync(outputDir, { recursive: true, force: true });

      process.env.PZG_SKIP = 'true';
      prismaGenerateSync(schemaPath, process.cwd());

      expect(existsSync(outputDir)).toBe(false);
    },
    GENERATION_TIMEOUT,
  );
});
