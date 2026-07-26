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

  /**
   * wrappers.ts calls itself "Drop-in replacements for standard Zod validators", and nothing about it
   * was drop-in. `precompiledValidators.X()` returns a result object and never throws, so:
   *
   *  - `parse` returned `{ success: false, error }` instead of throwing, so `try { parse(x) } catch`
   *    never fired and the return value was not the parsed data.
   *  - the adaptive validator's `safeParse` wrapped that in `{ success: true, data: result }`, so
   *    invalid input came back as `{"success":true,"data":{"success":false,"error":"id is required"}}`.
   *    A caller writing `if (r.success) use(r.data)` — the whole point of safeParse — got a garbage
   *    object and no indication anything was wrong. Measured on the emitted output.
   *  - `parse` was typed sync but returned a Promise for arrays of 100 or more, because it silently
   *    switched to the streaming path.
   */
  describe('the emitted validator API', () => {
    let mod: Record<string, any>;
    const valid = {
      id: 'a1',
      email: 'someone@example.com',
      seats: 3,
      tier: 'PRO',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    beforeAll(async () => {
      const out = await generate('wrapper-api', {});
      mod = await import(join(out, 'wrappers.ts'));
    }, GENERATION_TIMEOUT);

    it('parse returns the data itself on success', () => {
      const parsed = mod.AccountPerformance.parse(valid);

      // Not a result envelope: the caller asked for the row.
      expect(parsed).toMatchObject({ id: 'a1', email: 'someone@example.com' });
      expect(parsed).not.toHaveProperty('success');
    });

    it('parse throws on invalid input, naming the field', () => {
      expect(() => mod.AccountPerformance.parse({ nope: true })).toThrow(/email|id|required/i);
    });

    it('safeParse reports failure for invalid input', () => {
      const result = mod.AccountPerformance.safeParse({ nope: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('safeParse returns the row, not a nested result, on success', () => {
      const result = mod.AccountPerformance.safeParse(valid);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ id: 'a1' });
      // The specific failure: data held another {success,error} object.
      expect(result.data).not.toHaveProperty('success');
    });

    describe('the adaptive validator', () => {
      it('does not report success for invalid input', () => {
        const result = mod.AccountAdaptive.safeParse({ nope: true });

        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).not.toContain('"success":true');
      });

      it('throws from parse rather than returning a failure', () => {
        expect(() => mod.AccountAdaptive.parse({ nope: true })).toThrow();
      });

      it('never returns a promise from a synchronous method', () => {
        expect(mod.AccountAdaptive.parse(valid)).not.toBeInstanceOf(Promise);
        expect(mod.AccountAdaptive.safeParse(valid)).not.toBeInstanceOf(Promise);
      });

      it('handles many rows through an explicitly asynchronous method', async () => {
        const rows = Array.from({ length: 250 }, () => valid);

        // Whatever it is called, an array API must be awaited rather than pretending to be sync.
        const result = await mod.AccountAdaptive.safeParseMany(rows);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(250);
      });

      it('reports which row failed when validating many', async () => {
        const rows = [valid, { nope: true }, valid];

        const result = await mod.AccountAdaptive.safeParseMany(rows);

        expect(result.success).toBe(false);
        expect(JSON.stringify(result.errors ?? result.error)).toMatch(/1/);
      });
    });
  });

  describe('streaming progress and counts', () => {
    let streaming: Record<string, any>;
    const valid = {
      id: 'a1',
      email: 'someone@example.com',
      seats: 3,
      tier: 'PRO',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    beforeAll(async () => {
      const out = await generate('streaming-progress', {});
      streaming = await import(join(out, 'streaming.ts'));
    }, GENERATION_TIMEOUT);

    it('calls onProgress once per chunk, not once per record', async () => {
      // `result.processed++; onProgress?.(...)` sat inside the per-item map, so 100,000 records meant
      // 100,000 callbacks — and the pack's own README example is
      // `onProgress: (processed, total) => console.log(...)`, which then prints 100,000 lines and
      // costs more than the validation it is reporting on.
      const rows = Array.from({ length: 250 }, () => valid);
      let calls = 0;

      await streaming.validateStream('Account', rows, {
        chunkSize: 50,
        onProgress: () => {
          calls++;
        },
      });

      expect(calls).toBe(5);
    });

    it('reports the running total to onProgress', async () => {
      const rows = Array.from({ length: 100 }, () => valid);
      const seen: Array<[number, number]> = [];

      await streaming.validateStream('Account', rows, {
        chunkSize: 25,
        onProgress: (processed: number, total: number) => {
          seen.push([processed, total]);
        },
      });

      expect(seen).toEqual([
        [25, 100],
        [50, 100],
        [75, 100],
        [100, 100],
      ]);
    });

    it('counts a row whose validation threw', async () => {
      // `result.processed++` was inside the try block only, so anything that threw was recorded as
      // invalid and then never counted — leaving `processed` short of the rows actually handled.
      const exploding = new Proxy(
        {},
        {
          get() {
            throw new Error('column read failed');
          },
        },
      );
      const rows = [valid, exploding, valid];

      const result = await streaming.validateStream('Account', rows, { chunkSize: 10 });

      expect(result.processed).toBe(3);
      expect(result.invalid).toHaveLength(1);
      expect(result.valid).toHaveLength(2);
    });
  });

  describe('validateBatchParallel', () => {
    let batch: Record<string, any>;
    const valid = {
      id: 'a1',
      email: 'someone@example.com',
      seats: 3,
      tier: 'PRO',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    beforeAll(async () => {
      const out = await generate('batch-parallel', {});
      batch = await import(join(out, 'batch.ts'));
    }, GENERATION_TIMEOUT);

    it('runs on the minimum supported Node version', async () => {
      // `workers = navigator.hardwareConcurrency || 4` referenced a DOM global. Node only added
      // `navigator` in v21, and this package supports >=20.19.0 — which CI tests — so on the floor
      // version the first call threw ReferenceError. Deleting the global reproduces that exactly.
      const saved = (globalThis as { navigator?: unknown }).navigator;
      delete (globalThis as { navigator?: unknown }).navigator;
      try {
        const result = await batch.validateBatchParallel('Account', [valid, valid]);
        expect(result.valid).toHaveLength(2);
      } finally {
        if (saved !== undefined) {
          Object.defineProperty(globalThis, 'navigator', { value: saved, configurable: true });
        }
      }
    });

    it('validates every row and reports the failures', async () => {
      const rows = [valid, { nope: true }, valid, valid];

      const result = await batch.validateBatchParallel('Account', rows, { workers: 2 });

      expect(result.valid).toHaveLength(3);
      expect(result.errors).toHaveLength(1);
      expect(result.totalProcessed).toBe(4);
    });

    it('keeps error indices pointing at the original rows', async () => {
      // Chunking must not renumber the rows: an error at index 5 has to mean the sixth input.
      const rows = Array.from({ length: 10 }, (_, i) => (i === 5 ? { nope: true } : valid));

      const result = await batch.validateBatchParallel('Account', rows, { workers: 3 });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(5);
    });
  });

  describe('the emitted guide', () => {
    /**
     * Two separate problems, both in shipped documentation for a paid feature.
     *
     * The performance figures were presented as measurements and were not: `speedImprovement` is a
     * three-way constant chosen by counting relation and Json columns, `memoryReduction` is the
     * literal 45, and the sizes are `fieldCount * 50` and `fieldCount * 25` with "KB" appended. So
     * every customer's README claimed "~2.1x faster than standard Zod", "~45% reduction" and a
     * before/after byte size, none of which anything had timed or weighed.
     *
     * The config echo read the raw `config` argument instead of the resolved defaults, so with
     * `enablePerformance = true` and no explicit options it reported "Optimization Level: undefined",
     * "Streaming: Disabled", "Precompilation: Disabled" and "Batching: Disabled" — while the console
     * printed "aggressive" and all three modules sat in the same directory.
     */
    let readme: string;
    let out: string;

    beforeAll(async () => {
      out = await generate('guide', {});
      readme = readFileSync(join(out, 'README.md'), 'utf-8');
    }, GENERATION_TIMEOUT);

    it('does not present invented figures as measurements', () => {
      expect(readme).not.toMatch(/~?\d+(\.\d+)?x faster/i);
      expect(readme).not.toMatch(/~?\d+% (reduction|less memory)/i);
      // The sizes were fieldCount arithmetic with a KB suffix.
      expect(readme).not.toMatch(/\d+KB \(vs \d+KB original\)/);
    });

    it('echoes the configuration that was actually used', () => {
      expect(readme).not.toContain('undefined');
      // Defaults: aggressive, medium, and all three modules on.
      expect(readme).toMatch(/aggressive/);
      expect(readme).toMatch(/medium/);
      expect(readme).not.toMatch(/Streaming.*Disabled/);
      expect(readme).not.toMatch(/Precompilation.*Disabled/);
      expect(readme).not.toMatch(/Batching.*Disabled/);
    });

    it('echoes an explicit configuration too', async () => {
      const custom = await generate('guide-custom', {
        optimizationLevel: 'basic',
        targetSize: 'large',
        enableStreaming: true,
      });
      const text = readFileSync(join(custom, 'README.md'), 'utf-8');

      expect(text).toMatch(/basic/);
      expect(text).toMatch(/large/);
      expect(text).not.toContain('undefined');
    });

    it('uses the reader’s own model names in its examples', () => {
      // Every example was written against `User` and `Post`. On a schema with neither, the guide
      // demonstrated the API with models the customer does not have — the same defect Data Factories
      // had when it emitted validators for a hardcoded sample.
      const mentioned = [...readme.matchAll(/precompiledValidators\.(\w+)/g)].map((m) => m[1]);
      const inSchema = ['Member', 'Project', 'Account'];

      expect(mentioned.length).toBeGreaterThan(0);
      for (const name of mentioned) expect(inSchema).toContain(name);

      for (const absent of ['User', 'Post']) {
        expect(readme, `the guide should not reference ${absent}`).not.toMatch(
          new RegExp(`['"\\.]${absent}['"\\)]`),
        );
      }
    });

    it('points the reader at the benchmark suite instead of quoting numbers', () => {
      // If the pack will not measure, it should say how the reader can.
      expect(readme).toMatch(/benchmark/i);
    });
  });

  describe('the benchmark harness', () => {
    /**
     * The README now tells the reader to run this instead of quoting invented figures, so it has to
     * produce real ones. It did not: `runBenchmark` called `fn()` inside a synchronous loop with no
     * `await`, while `runAllBenchmarks` passes `async () => await validateStream(...)` as one of its
     * arms. That timed the synchronous prologue of a promise and reported the result as the duration —
     * a measured-looking number for work that had not finished. The same missing `await` meant
     * `try { fn() } catch` could not catch a rejection, so a failing arm reported a 0% error rate
     * while leaving `iterations` unawaited promises in flight.
     */
    let suite: any;
    let benchmarks: Record<string, any>;

    beforeAll(async () => {
      const out = await generate('benchmarks', {});
      benchmarks = await import(join(out, 'benchmarks.ts'));
      suite = new benchmarks.BenchmarkSuite();
    }, GENERATION_TIMEOUT);

    it('waits for an asynchronous arm before recording its time', async () => {
      const delayMs = 20;
      const result = await suite.runBenchmark(
        'sleep',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        },
        3,
      );

      // Unawaited, this reported a fraction of a millisecond.
      expect(result.avgTime).toBeGreaterThanOrEqual(delayMs * 0.7);
    });

    it('counts a rejection as an error', async () => {
      const result = await suite.runBenchmark(
        'always rejects',
        async () => {
          throw new Error('nope');
        },
        4,
      );

      expect(result.errorRate).toBe(1);
    });

    it('does not claim to compare against a baseline it never produces', () => {
      const source = readFileSync(
        join(process.cwd(), 'src/pro/features/performance-pack/performance-pack.ts'),
        'utf-8',
      );
      // compareWithBaseline takes results the caller captured; the file must not advertise otherwise.
      expect(source).not.toMatch(/Compare standard vs optimized validation performance/);
    });
  });

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
