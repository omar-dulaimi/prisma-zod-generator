import { execSync } from 'child_process';
import { existsSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import { prismaGenerateSync } from './prisma-generate';

const MULTI_PROVIDER_PROVIDERS = ['postgresql', 'mysql', 'mongodb', 'sqlite', 'sqlserver'] as const;

const TEST_ENV_PREFIX = 'test-env-';

/**
 * Build the generator once before any test worker starts.
 *
 * Tests spawn `prisma generate`, which runs `node ./lib/generator.js`. Previously
 * each `runGeneration()` call rebuilt `lib/` with `npx tsc`; under
 * VITEST_MAX_WORKERS=16 that meant many workers rewriting the shared `lib/`
 * concurrently while other workers were spawning the generator from it, so a
 * generation occasionally loaded a half-written module — surfacing as
 * intermittent `ENOENT .../generated/schemas/models` or
 * `handler.onGenerate is not a function` failures that passed on isolated reruns.
 *
 * Building here (once, in the main process, before the pool spawns) makes `lib/`
 * stable on disk for the whole run; `runGeneration()` no longer rebuilds.
 */
function buildGenerator(): void {
  execSync('npx tsc', { cwd: process.cwd(), stdio: 'inherit' });
}

/**
 * Generate the per-provider fixture schemas that several suites read.
 *
 * `tests/multi-provider/schemas/<provider>/generated` is gitignored and was only
 * produced as a side effect of running `multi-provider.test.ts`. Suites such as
 * mongodb-schema-coverage, comprehensive-schema-coverage and
 * typescript-inference-lazy-relations import from it, so on a fresh checkout they
 * passed or failed depending on file order — and on CI they failed outright.
 * Generating here removes the cross-file dependency.
 *
 * No database is involved: the provider fixtures are only run through
 * `prisma generate`, which never connects.
 */
function generateMultiProviderFixtures(): void {
  for (const provider of MULTI_PROVIDER_PROVIDERS) {
    const schemaPath = path.join(
      process.cwd(),
      'tests',
      'multi-provider',
      'schemas',
      provider,
      'schema.prisma',
    );
    if (!existsSync(schemaPath)) continue;

    try {
      prismaGenerateSync(schemaPath, process.cwd());
    } catch (error) {
      // Surface the reason but let the run continue: the suites that need these
      // fixtures report a clearer failure than an aborted setup would.
      console.warn(
        `[global-setup] Could not generate ${provider} fixtures:`,
        error instanceof Error ? error.message.split('\n')[0] : error,
      );
    }
  }
}

/**
 * Delete every `test-env-*` scratch directory in the repository root.
 *
 * `TestEnvironment.createTestEnv()` writes one of these per test env and returns a
 * `cleanup()` the test is meant to call. Plenty of tests don't — some assert on
 * generated files after the last `await`, some bail early — and the safety nets
 * behind it don't cover the gap: the `process.on('exit')` hook is registered inside
 * a pooled worker thread that vitest may reuse rather than exit, and the stale sweep
 * in `createTestEnv` only removes directories older than six hours *and* only runs
 * when some later test happens to create an env. So a normal green run routinely
 * left dozens of them behind, and they accumulated until someone ran
 * `pnpm test:clean-envs` by hand.
 *
 * Running this from globalSetup fixes both ends: once before the pool spawns (so a
 * previous run that was killed doesn't leave litter), and once in the teardown that
 * vitest calls after the run finishes, pass or fail.
 *
 * Set `KEEP_TEST_ENVS=1` to keep them for debugging.
 */
function sweepTestEnvs(when: 'before' | 'after'): void {
  if (process.env.KEEP_TEST_ENVS === '1') return;

  const root = process.cwd();
  let removed = 0;

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(TEST_ENV_PREFIX)) continue;
    try {
      rmSync(path.join(root, entry.name), { recursive: true, force: true });
      removed++;
    } catch {
      // A directory still held open by a straggling child process is not worth
      // failing the run over — the next sweep gets it.
    }
  }

  if (removed > 0) {
    console.log(
      `[global-setup] Removed ${removed} test-env-* director${removed === 1 ? 'y' : 'ies'} (${when} run).`,
    );
  }
}

export default function setup(): () => void {
  sweepTestEnvs('before');
  buildGenerator();
  generateMultiProviderFixtures();

  return function teardown(): void {
    sweepTestEnvs('after');
  };
}
