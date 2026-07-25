import { execSync } from 'child_process';

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
export default function setup(): void {
  execSync('npx tsc', { cwd: process.cwd(), stdio: 'inherit' });
}
