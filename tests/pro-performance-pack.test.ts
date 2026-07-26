import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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

enum Tier {
  FREE
  PRO
}

model Account {
  id        String   @id @default(cuid())
  email     String   @unique
  nickname  String?
  seats     Int
  ratio     Float?
  tier      Tier     @default(FREE)
  isActive  Boolean
  createdAt DateTime @default(now())
  meta      Json?
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

  describe('the precompiled validator', () => {
    /**
     * The pack's headline claim is a drop-in validator "~2.1x faster than standard Zod". It emitted
     * `const stringFields = ['id', 'name']` for every model regardless of its fields, so it both
     * rejected valid rows — `nickname String?` absent, or a model with no `name` column at all —
     * and accepted invalid ones, ignoring email, enums, numbers, booleans and dates entirely. The
     * fixture's two models each had `id` plus one required string, so nothing here disagreed.
     */
    let validate: (data: unknown) => { success: boolean; error?: string };

    const valid = {
      id: 'a1',
      email: 'someone@example.com',
      seats: 3,
      tier: 'PRO',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    beforeAll(async () => {
      const out = await generate('precompiled-behaviour', {});
      const mod = await import(join(out, 'precompiled.ts'));
      validate = mod.validateAccountFast;
      expect(validate, 'validateAccountFast should be emitted').toBeTypeOf('function');
    }, GENERATION_TIMEOUT);

    it('accepts a row with every required field', () => {
      const result = validate(valid);
      expect(result.success, result.error).toBe(true);
    });

    it('accepts a row that omits an optional column', () => {
      // nickname, ratio and meta are all optional in the schema.
      expect(validate({ ...valid, nickname: undefined }).success).toBe(true);
      expect(validate({ ...valid, nickname: null }).success).toBe(true);
    });

    it('rejects a missing required column', () => {
      const withoutEmail: Record<string, unknown> = { ...valid };
      delete withoutEmail.email;
      expect(validate(withoutEmail).success).toBe(false);
    });

    it('rejects a required string given a number', () => {
      expect(validate({ ...valid, email: 42 }).success).toBe(false);
    });

    it('rejects a non-numeric value in an Int column', () => {
      expect(validate({ ...valid, seats: 'three' }).success).toBe(false);
    });

    it('rejects a non-boolean in a Boolean column', () => {
      expect(validate({ ...valid, isActive: 'yes' }).success).toBe(false);
    });

    it('rejects a value outside the enum', () => {
      expect(validate({ ...valid, tier: 'ENTERPRISE' }).success).toBe(false);
      expect(validate({ ...valid, tier: 'FREE' }).success).toBe(true);
    });

    it('does not demand a column the model has no equivalent of', () => {
      // `name` is not a column on Account. Requiring it was pure template accident.
      expect(validate(valid).success).toBe(true);
      expect(JSON.stringify(validate(valid))).not.toContain('name must be');
    });

    it('names the offending field so the error is actionable', () => {
      expect(validate({ ...valid, seats: 'three' }).error).toMatch(/seats/);
    });
  });

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

  /**
   * `enablePrecompilation: false` was caught and handled; `enableStreaming: false` and
   * `enableBatching: false` have exactly the same problem and were not. benchmarks.ts and
   * wrappers.ts import both modules unconditionally, so turning either off emitted files importing
   * something that was never written — output the customer cannot compile at all.
   *
   * Found by generating every documented value of every option and type-checking each result.
   */
  it(
    'emits every module it imports with streaming disabled',
    async () => {
      const out = await generate('no-streaming', { enableStreaming: false });
      expect(unresolvedImports(out)).toEqual([]);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits every module it imports with batching disabled',
    async () => {
      const out = await generate('no-batching', { enableBatching: false });
      expect(unresolvedImports(out)).toEqual([]);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'says so when it cannot honour enableStreaming: false',
    async () => {
      const logged: string[] = [];
      const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
      try {
        await generate('no-streaming-warn', { enableStreaming: false });
      } finally {
        spy.mockRestore();
      }

      expect(logged.join('\n')).toMatch(/enableStreaming/);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'says so when it cannot honour enableBatching: false',
    async () => {
      const logged: string[] = [];
      const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
      try {
        await generate('no-batching-warn', { enableBatching: false });
      } finally {
        spy.mockRestore();
      }

      expect(logged.join('\n')).toMatch(/enableBatching/);
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
