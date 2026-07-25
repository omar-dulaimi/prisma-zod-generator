import { getDMMF } from '@prisma/internals';
import { existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
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
