import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_PERFORMANCE = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'performance-pack',
  'performance-pack.ts',
);
const proAvailable = existsSync(PRO_PERFORMANCE);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Member {
  id    String @id @default(cuid())
  email String @unique
}

model Project {
  id    String @id @default(cuid())
  title String
}
`;

/**
 * Turning `enablePrecompilation` off skipped `precompiled.ts` but still emitted
 * the five modules that import it, so every one of them failed to resolve
 * (TS2307) and the pack could not be compiled at all. An option that breaks the
 * output when set is worse than one that is ignored.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Performance Pack module graph', () => {
  let root: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  async function generate(dirName: string, config: Record<string, unknown>) {
    const outputPath = join(root, dirName);
    const schemaPath = join(root, 'schema.prisma');

    const { generatePerformancePack } = await import(
      '../src/pro/features/performance-pack/performance-pack'
    );

    await generatePerformancePack(schemaPath, { outputPath, ...config });
    return outputPath;
  }

  /** Relative imports in emitted files that have no corresponding emitted module. */
  function unresolvedImports(dir: string): string[] {
    const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
    const emitted = new Set(files.map((name) => name.replace(/\.ts$/, '')));
    const missing: string[] = [];

    for (const file of files) {
      const source = readFileSync(join(dir, file), 'utf-8');
      for (const match of source.matchAll(/from '\.\/([^']+)'/g)) {
        const target = match[1].replace(/\.js$/, '');
        if (!emitted.has(target)) {
          missing.push(`${file} -> ./${target}`);
        }
      }
    }

    return missing;
  }

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    root = mkdtempSync(join(tmpdir(), 'pzg-performance-'));
    writeFileSync(join(root, 'schema.prisma'), SCHEMA);
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  it(
    'validates the models in the schema, not a hardcoded sample',
    async () => {
      // analyzeSchemas took its path in an underscore-prefixed parameter and
      // returned a fixed User/Post/Comment/Organization sample, so the pack
      // generated validators for models the customer does not have — the same
      // defect Data Factories had.
      const out = await generate('real-models', {});
      const precompiled = readFileSync(join(out, 'precompiled.ts'), 'utf-8');

      expect(precompiled).toContain('Member');
      expect(precompiled).toContain('Project');
      expect(precompiled).not.toContain('Comment');
      expect(precompiled).not.toContain('Organization');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'respects a model excluded in the generator config',
    async () => {
      // This pack takes (schemaPath, options) and parses the schema itself, so it
      // never passes through ProFeatureBase.getEnabledModels() — the `models`
      // exclusion every other pack honours was silently ignored here.
      const out = await generate('excluded', {
        models: { Project: { enabled: false } },
      });
      const precompiled = readFileSync(join(out, 'precompiled.ts'), 'utf-8');

      expect(precompiled).toContain('Member');
      expect(precompiled).not.toContain('Project');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'narrows to hotPaths when given',
    async () => {
      const out = await generate('hot', { hotPaths: ['Member'] });
      const precompiled = readFileSync(join(out, 'precompiled.ts'), 'utf-8');

      expect(precompiled).toContain('Member');
      expect(precompiled).not.toContain('Project');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits every module it imports, by default',
    async () => {
      const out = await generate('default', {});
      expect(unresolvedImports(out)).toEqual([]);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits every module it imports with precompilation disabled',
    async () => {
      const out = await generate('no-precompile', { enablePrecompilation: false });
      expect(unresolvedImports(out)).toEqual([]);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'offers a streaming API that does not accumulate results',
    async () => {
      // The pack claimed "constant memory usage regardless of dataset size" while
      // every valid record was retained in result.valid, so peak memory grew with
      // the input. A callback-per-record form makes the claim true for callers who
      // consume as they go.
      const out = await generate('constant-memory', {});
      const streaming = readFileSync(join(out, 'streaming.ts'), 'utf-8');

      expect(streaming).toContain('onValid');
      expect(streaming).toMatch(/collectResults/);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'says so when it cannot honour enablePrecompilation: false',
    async () => {
      const logged: string[] = [];
      const original = console.log;
      console.log = (...args: unknown[]) => {
        logged.push(args.join(' '));
      };
      try {
        await generate('warns', { enablePrecompilation: false });
      } finally {
        console.log = original;
      }

      expect(logged.join('\n')).toContain('enablePrecompilation');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'honours maxConcurrency instead of dispatching the whole chunk',
    async () => {
      // The option was accepted and decorative: Promise.all over the entire chunk
      // meant in-flight work always equalled chunkSize.
      const out = await generate('concurrency', {});
      const streaming = readFileSync(join(out, 'streaming.ts'), 'utf-8');

      expect(streaming).toContain('start += maxConcurrency');
      expect(streaming).not.toMatch(/await Promise\.all\(chunkPromises\);/);
    },
    GENERATION_TIMEOUT,
  );
});
