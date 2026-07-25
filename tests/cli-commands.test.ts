import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const REPO_ROOT = join(__dirname, '..');
const PZG_PRO_BIN = join(REPO_ROOT, 'lib', 'cli', 'pzg-pro.js');

/**
 * Both of these are published entry points — `bin.prisma-zod-generator` routes
 * `license-check` here, and `bin.pzg-pro` is this file — and neither had any coverage.
 * A broken `license-check` is the first thing a paying customer would hit when a Pro
 * feature refuses to run, and it is the one command whose whole job is to explain why.
 */
describe('license-check command', () => {
  const saved = { key: process.env.PZG_LICENSE_KEY, devMode: process.env.PZG_DEV_MODE };
  let logs: string[];
  let exitCode: number | undefined;

  /** Sentinel thrown in place of process.exit, so control stops as it would live. */
  class ProcessExit extends Error {}

  beforeEach(() => {
    logs = [];
    exitCode = undefined;
    delete process.env.PZG_LICENSE_KEY;
    delete process.env.PZG_DEV_MODE;

    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      exitCode = code;
      // The real call terminates. Without throwing, execution would fall through and
      // print the success output after having reported failure.
      throw new ProcessExit(`exit ${code}`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (saved.key === undefined) delete process.env.PZG_LICENSE_KEY;
    else process.env.PZG_LICENSE_KEY = saved.key;
    if (saved.devMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = saved.devMode;
  });

  it(
    'exits non-zero and says how to get a licence when there is none',
    async () => {
      const { runLicenseCheck } = await import('../src/cli/license-check');

      await expect(runLicenseCheck()).rejects.toThrow(ProcessExit);
      expect(exitCode).toBe(1);

      const output = logs.join('\n');
      expect(output).toContain('No valid license found');
      expect(output).toContain('PZG_LICENSE_KEY');
      // A failure message that does not say where to get a licence is a support ticket.
      expect(output).toMatch(/https?:\/\/\S*pricing/);
      // Must not claim success anywhere in the failure path.
      expect(output).not.toContain('Ready to use PZG Pro features');
    },
    GENERATION_TIMEOUT,
  );

  it.skipIf(!existsSync(join(REPO_ROOT, 'src', 'pro', '.git')))(
    'reports the plan and does not exit when a licence is accepted',
    async () => {
      // The local development bypass is the only way to exercise the success path
      // without a real key; it requires this repo's private submodule, so it is
      // skipped on a plain checkout.
      process.env.PZG_DEV_MODE = 'true';
      const { runLicenseCheck } = await import('../src/cli/license-check');

      await runLicenseCheck();

      expect(exitCode).toBeUndefined();
      const output = logs.join('\n');
      expect(output).toContain('Valid PZG Pro license found');
      expect(output).toContain('Plan:');
      expect(output).toContain('Ready to use PZG Pro features');
    },
    GENERATION_TIMEOUT,
  );
});

/**
 * `pzg-pro` decides at module scope whether it is a CLI invocation or a Prisma
 * generator, and in the latter case blocks on stdin waiting for Prisma's JSON-RPC.
 * That makes it untestable in-process — these run the built binary the way a user's
 * shell does.
 */
describe('pzg-pro binary', () => {
  function run(args: string[]): { status: number; output: string } {
    try {
      const output = execFileSync('node', [PZG_PRO_BIN, ...args], {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return { status: 0, output };
    } catch (error) {
      const err = error as { status?: number; stdout?: string; stderr?: string };
      return { status: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  }

  it(
    'prints usage and succeeds for --help',
    () => {
      const { status, output } = run(['--help']);

      expect(status).toBe(0);
      expect(output).toContain('PZG Pro CLI');
      expect(output).toContain('pzg-pro guard');
      // The generator-block form is the main way this is used, so help must show it.
      expect(output).toContain('generator pzgPro');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'rejects an unknown command with a non-zero status and a usable hint',
    () => {
      const { status, output } = run(['definitely-not-a-command']);

      expect(status).toBe(1);
      expect(output).toContain('definitely-not-a-command');
      expect(output).toContain('pzg-pro guard --help');
    },
    GENERATION_TIMEOUT,
  );
});
