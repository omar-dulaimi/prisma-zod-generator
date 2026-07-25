import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { prismaGenerateSync } from './prisma-generate';

const MULTI_PROVIDER_PROVIDERS = ['postgresql', 'mysql', 'mongodb', 'sqlite', 'sqlserver'] as const;

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

export default function setup(): void {
  buildGenerator();
  generateMultiProviderFixtures();
}
