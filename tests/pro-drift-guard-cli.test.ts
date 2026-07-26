import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const REPO_ROOT = join(__dirname, '..');
const PZG_PRO_BIN = join(REPO_ROOT, 'lib', 'cli', 'pzg-pro.js');
const proAvailable = existsSync(join(REPO_ROOT, 'src', 'pro', 'index.ts'));

/**
 * `pzg-pro guard` is the documented way to run Drift Guard in CI without Prisma invoking the
 * generator, and nothing exercised it. The binary's `--help` and unknown-command paths were
 * covered, but the one command it actually has was not: `runDriftGuardCLI` and its five helpers
 * were the largest block of genuinely uncovered functions left anywhere in the codebase.
 *
 * It compares two git refs, so these tests build a real repository with two commits.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('pzg-pro guard', () => {
  let repo: string;

  const BASE_SCHEMA = `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id       String  @id @default(cuid())
  email    String  @unique
  nickname String?
}
`;

  /** Drops a field and makes an optional one required — both breaking. */
  const BREAKING_SCHEMA = `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id       String @id @default(cuid())
  nickname String
}
`;

  function git(args: string[], cwd = repo) {
    return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  }

  function runGuard(args: string[]): { status: number; output: string } {
    try {
      const output = execFileSync('node', [PZG_PRO_BIN, 'guard', ...args], {
        cwd: repo,
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env, PZG_DEV_MODE: 'true' },
      });
      return { status: 0, output };
    } catch (error) {
      const err = error as { status?: number; stdout?: string; stderr?: string };
      return { status: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  }

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'pzg-guard-'));
    mkdirSync(join(repo, 'prisma'), { recursive: true });

    git(['init', '-q']);
    git(['config', 'user.email', 'test@example.com']);
    git(['config', 'user.name', 'Test']);

    writeFileSync(join(repo, 'prisma', 'schema.prisma'), BASE_SCHEMA);
    git(['add', '-A']);
    git(['commit', '-qm', 'base schema']);
    git(['branch', 'base-ref']);

    writeFileSync(join(repo, 'prisma', 'schema.prisma'), BREAKING_SCHEMA);
    git(['add', '-A']);
    git(['commit', '-qm', 'breaking change']);
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it(
    'prints usage for --help without needing a repository or a schema',
    () => {
      const { status, output } = runGuard(['--help']);

      expect(status).toBe(0);
      expect(output).toContain('pzg-pro guard');
      // Every documented flag should appear, or the help is worse than none.
      for (const flag of ['--schema', '--base', '--head', '--format', '--json'])
        expect(output, `help should mention ${flag}`).toContain(flag);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'fails and reports the breaking changes between two refs',
    () => {
      const { status, output } = runGuard(['--base', 'base-ref', '--head', 'HEAD']);

      // A guard that exits 0 on a breaking change is worse than no guard: CI would pass.
      expect(status).not.toBe(0);
      expect(output).toContain('email');
      expect(output).toMatch(/nickname/);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits parseable JSON for --json',
    () => {
      const { output } = runGuard(['--base', 'base-ref', '--head', 'HEAD', '--json']);

      // The point of the JSON format is that another tool consumes it.
      const start = output.indexOf('{');
      expect(start, 'expected JSON in the output').toBeGreaterThanOrEqual(0);

      const parsed = JSON.parse(output.slice(start, output.lastIndexOf('}') + 1));
      expect(parsed).toBeTypeOf('object');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'passes when nothing changed between the refs',
    () => {
      const { status } = runGuard(['--base', 'HEAD', '--head', 'HEAD']);

      expect(status).toBe(0);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'reports a bad --format rather than silently choosing one',
    () => {
      const { status, output } = runGuard(['--base', 'base-ref', '--format', 'not-a-format']);

      expect(status).not.toBe(0);
      expect(output).toMatch(/not-a-format|format/i);
    },
    GENERATION_TIMEOUT,
  );
});
