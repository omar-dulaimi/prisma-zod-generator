import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_DRIFT_GUARD = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'drift-guard',
  'DriftGuardGenerator.ts',
);
const proAvailable = existsSync(PRO_DRIFT_GUARD);

const BASE_SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  nickname String?
  role     Role    @default(MEMBER)
}

model Post {
  id    Int    @id @default(autoincrement())
  title String
}
`;

// Post removed, Comment added, nickname made required, MEMBER removed, bio added.
const HEAD_SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  ADMIN
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  nickname String
  role     Role    @default(ADMIN)
  bio      String?
}

model Comment {
  id   Int    @id @default(autoincrement())
  body String
}
`;

/**
 * Drift Guard's report builders wrote every line break as a literal `\n`
 * two-character escape rather than a newline, so the GitHub report — the default
 * format, and the one the CI recipe posts to a pull request — arrived as a single
 * line with visible `\n` throughout. The text format was half-converted: real
 * newlines in the body, literal escapes in the header.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Drift Guard report formatting', () => {
  async function detectChanges(config: Record<string, unknown> = {}) {
    const { DriftGuardGenerator } = await import(
      '../src/pro/features/drift-guard/DriftGuardGenerator'
    );

    const [base, head] = await Promise.all([
      getDMMF({ datamodel: BASE_SCHEMA }),
      getDMMF({ datamodel: HEAD_SCHEMA }),
    ]);

    const generator = new DriftGuardGenerator(
      {
        dmmf: head,
        models: [...head.datamodel.models],
        enums: [...head.datamodel.enums],
        generatorConfig: {},
        schemaPath: '/tmp/schema.prisma',
        outputPath: '/tmp/out',
        prismaClientPath: '@prisma/client',
        provider: 'postgresql',
      },
      config,
    );

    return { generator, changes: generator.compareSchemas(base, head) };
  }

  it(
    'detects the breaking and non-breaking changes',
    async () => {
      const { changes } = await detectChanges();
      const byChange = new Map(changes.map((c) => [`${c.model}.${c.field ?? ''}:${c.change}`, c]));

      expect(byChange.get('Post.:model_removed')?.type).toBe('breaking');
      expect(byChange.get('User.nickname:optional_to_required')?.type).toBe('breaking');
      expect(byChange.get('Role.MEMBER:enum_value_removed')?.type).toBe('breaking');
      expect(byChange.get('Comment.:model_added')?.type).toBe('non-breaking');
      expect(byChange.get('User.bio:field_added')?.type).toBe('non-breaking');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'renders the GitHub report as real markdown',
    async () => {
      const { generator, changes } = await detectChanges({ outputFormat: 'github' });
      const report = generator.formatOutput(changes);

      // The regression: a literal backslash-n anywhere means the report is one line.
      expect(report).not.toContain('\\n');
      expect(report.split('\n').length).toBeGreaterThan(5);
      expect(report).toContain('## 🚨 PZG Pro Drift Guard Report');
      expect(report).toContain('### ❌ Breaking Changes');
      expect(report).toContain('- **Post**: Model "Post" was removed');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'renders the text report with a real header',
    async () => {
      const { generator, changes } = await detectChanges({ outputFormat: 'text' });
      const report = generator.formatOutput(changes);

      expect(report).not.toContain('\\n');
      expect(report.split('\n')[0]).toBe('PZG Pro Drift Guard Report');
      expect(report).toContain('Summary: 5 total changes (3 breaking)');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'keeps JSON output parseable',
    async () => {
      const { generator, changes } = await detectChanges({ outputFormat: 'json' });
      const parsed = JSON.parse(generator.formatOutput(changes));

      expect(parsed.summary).toEqual({ total: 5, breaking: 3, nonBreaking: 2 });
    },
    GENERATION_TIMEOUT,
  );

  /**
   * `validateDrift` is exported from src/pro/index.ts but was a demo stub: it
   * returned hardcoded changes keyed off `strictMode` without opening either
   * schema, so a caller reaching for the obvious name got fabricated results.
   */
  describe('validateDrift by file path', () => {
    let base: string;
    let head: string;
    let dir: string;
    const savedDevMode = process.env.PZG_DEV_MODE;

    beforeAll(() => {
      // This entry point checks the licence, unlike the generator class the tests
      // above drive directly.
      process.env.PZG_DEV_MODE = 'true';
      dir = mkdtempSync(join(tmpdir(), 'pzg-drift-'));
      base = join(dir, 'base.prisma');
      head = join(dir, 'head.prisma');
      writeFileSync(base, BASE_SCHEMA);
      writeFileSync(head, HEAD_SCHEMA);
    });

    afterAll(() => {
      if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
      else process.env.PZG_DEV_MODE = savedDevMode;
      rmSync(dir, { recursive: true, force: true });
    });

    it(
      'reports the changes actually present in the two files',
      async () => {
        const { validateDrift } = await import('../src/pro/features/drift-guard/drift-guard');

        const result = await validateDrift({
          basePath: base,
          headPath: head,
          outputFormat: 'json',
        });
        const parsed = JSON.parse(result.output);

        expect(parsed.summary).toEqual({ total: 5, breaking: 3, nonBreaking: 2 });
      },
      GENERATION_TIMEOUT,
    );

    it(
      'reports no changes when both paths are the same schema',
      async () => {
        const { validateDrift } = await import('../src/pro/features/drift-guard/drift-guard');

        const result = await validateDrift({
          basePath: base,
          headPath: base,
          outputFormat: 'json',
        });

        expect(JSON.parse(result.output).summary.total).toBe(0);
        expect(result.success).toBe(true);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'fails under strictMode when a breaking change is present',
      async () => {
        const { validateDrift } = await import('../src/pro/features/drift-guard/drift-guard');

        const result = await validateDrift({
          basePath: base,
          headPath: head,
          strictMode: true,
          outputFormat: 'json',
        });

        expect(result.success).toBe(false);
      },
      GENERATION_TIMEOUT,
    );
  });

  it(
    'distinguishes whitelisted breaks in the summary',
    async () => {
      // `Summary: 5 total changes (3 breaking)` with exit 0 reads like a failure in
      // a CI log when every break was explicitly allowed.
      const { generator, changes } = await detectChanges({
        outputFormat: 'text',
        strictMode: true,
        allowedBreaks: [
          'Post:model_removed',
          'User.nickname:optional_to_required',
          'Role.MEMBER:enum_value_removed',
        ],
      });

      expect(generator.formatOutput(changes)).toMatch(/whitelisted/i);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'honours allowedBreaks when deciding whether CI should fail',
    async () => {
      const { generator, changes } = await detectChanges({ strictMode: true });
      expect(generator.shouldFailCI(changes)).toBe(true);

      const { generator: lenient, changes: same } = await detectChanges({
        strictMode: true,
        allowedBreaks: [
          'Post:model_removed',
          'User.nickname:optional_to_required',
          'Role.MEMBER:enum_value_removed',
        ],
      });
      expect(lenient.shouldFailCI(same)).toBe(false);
    },
    GENERATION_TIMEOUT,
  );
});
