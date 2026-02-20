import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment } from './helpers';

describe('TestEnvironment cleanup behavior', () => {
  it('removes stale test-env directories from interrupted runs', async () => {
    const staleTimestamp = Date.now() - 7 * 60 * 60 * 1000;
    const staleDir = join(process.cwd(), `test-env-interrupted-run-${staleTimestamp}`);

    rmSync(staleDir, { recursive: true, force: true });
    mkdirSync(staleDir, { recursive: true });

    const env = await TestEnvironment.createTestEnv('cleanup-stale-interrupted-runs');

    try {
      expect(existsSync(staleDir)).toBe(false);
    } finally {
      await env.cleanup();
      rmSync(staleDir, { recursive: true, force: true });
    }
  });

  it('keeps recent test-env directories intact', async () => {
    const recentTimestamp = Date.now() - 5 * 60 * 1000;
    const recentDir = join(process.cwd(), `test-env-recent-run-${recentTimestamp}`);

    rmSync(recentDir, { recursive: true, force: true });
    mkdirSync(recentDir, { recursive: true });

    const env = await TestEnvironment.createTestEnv('cleanup-recent-interrupted-runs');

    try {
      expect(existsSync(recentDir)).toBe(true);
    } finally {
      await env.cleanup();
      rmSync(recentDir, { recursive: true, force: true });
    }
  });
});
