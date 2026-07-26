import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chooseUpsellHint } from '../src/prisma-generator';
import { GENERATION_TIMEOUT } from './helpers';

const REPO_ROOT = join(__dirname, '..');

/**
 * The post-generation banner sat behind `if (true)`, so it printed on every single
 * `prisma generate` — dozens of times a day for anyone working on a schema — and in CI logs too,
 * since nothing checked for it. A run counter incremented above it and gated nothing.
 *
 * These tests are about restraint rather than marketing: the pitch has to be quiet where nobody
 * asked for it, and it has to tell people how to turn it off.
 */
describe('post-generation banner', () => {
  const root = join(process.cwd(), `test-env-banner-${process.pid}`);

  const schemaFor = (models: string) => `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}
${models}`;

  const PLAIN = `
model User {
  id    String @id @default(cuid())
  email String @unique
}
`;

  function generate(label: string, models: string, env: Record<string, string> = {}) {
    const dir = join(root, label);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'schema.prisma'), schemaFor(models));
    writeFileSync(
      join(dir, 'prisma.config.mjs'),
      `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '${join(dir, 'schema.prisma')}',
  datasource: { url: 'postgresql://postgres:postgres@localhost:5432/postgres' },
});
`,
    );

    try {
      return execFileSync(
        join(REPO_ROOT, 'node_modules', '.bin', 'prisma'),
        ['generate', '--config', join(dir, 'prisma.config.mjs')],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          stdio: 'pipe',
          // Cleared so the harness's own CI vars do not decide the outcome under test.
          env: { ...process.env, CI: '', GITHUB_ACTIONS: '', PZG_NO_BANNER: '', ...env },
        },
      );
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string };
      return `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }
  }

  beforeAll(() => {
    mkdirSync(root, { recursive: true });
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(join(process.cwd(), 'node_modules', '.cache', 'prisma-zod-generator'), {
      recursive: true,
      force: true,
    });
  });

  it(
    'says nothing when CI is set',
    () => {
      const output = generate('ci', PLAIN, { CI: 'true' });

      expect(output).not.toContain('pricing');
      expect(output).not.toMatch(/PZG Pro|powered \d+ runs/);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'says nothing when GITHUB_ACTIONS is set',
    () => {
      expect(generate('gha', PLAIN, { GITHUB_ACTIONS: 'true' })).not.toContain('pricing');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'says nothing when silenced explicitly',
    () => {
      expect(generate('opted-out', PLAIN, { PZG_NO_BANNER: '1' })).not.toContain('pricing');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'says nothing when stdout is not a terminal',
    () => {
      // execFileSync pipes stdout, so isTTY is false — which is every scripted invocation,
      // including anything reading the generator's output.
      expect(generate('piped', PLAIN)).not.toContain('pricing');
    },
    GENERATION_TIMEOUT,
  );

  it('does not promise a trial, because there is no trial mechanism', () => {
    // The old banner advertised "14-day trial, no card needed" while nothing in src/license.ts
    // implemented one. An unsupported claim discredits the rest of the pitch.
    const source = readFileSync(join(REPO_ROOT, 'src', 'prisma-generator.ts'), 'utf-8');

    expect(source).not.toMatch(/14[- ]day/i);
    expect(source).not.toMatch(/no card needed/i);
  });

  it('offers a way to turn it off', () => {
    const source = readFileSync(join(REPO_ROOT, 'src', 'prisma-generator.ts'), 'utf-8');
    expect(source).toContain('PZG_NO_BANNER=1 to silence it');
  });

  describe('contextual hints', () => {
    // Selection is pure logic over the model list, so it is exercised directly. Going through a
    // real generation cannot observe it: the banner returns early when stdout is not a terminal,
    // which is exactly what it should do, and a piped test harness is never a terminal.
    const field = (name: string, documentation?: string) => ({ name, documentation });
    const model = (name: string, fields: { name: string; documentation?: string }[]) => ({
      name,
      fields,
    });

    it('picks the tenant hint when most models carry a tenant column', () => {
      const hint = chooseUpsellHint([
        model('User', [field('id'), field('tenantId')]),
        model('Post', [field('id'), field('organizationId')]),
        model('Comment', [field('id'), field('tenantId')]),
      ]);

      expect(hint?.id).toBe('multi-tenant');
      // Naming their actual numbers is the whole reason this beats a feature list.
      expect(hint?.lines.join(' ')).toMatch(/3 of your 3 models/);
    });

    it('picks the policies hint when the schema already uses those annotations', () => {
      // Someone writing `/// @pii` is describing a need the pack exists to serve.
      const hint = chooseUpsellHint([
        model('User', [field('id'), field('email', '@pii email redact:logs')]),
      ]);

      expect(hint?.id).toBe('policies');
    });

    it('prefers the annotation hint over the tenant one', () => {
      // Both match here. The annotation is the stronger signal: they are already writing the
      // syntax, rather than merely having a column shaped like a tenant key.
      const hint = chooseUpsellHint([
        model('User', [
          field('tenantId'),
          field('email', '@policy read:where tenantId == ctx.tenantId'),
        ]),
        model('Post', [field('tenantId')]),
      ]);

      expect(hint?.id).toBe('policies');
    });

    it('picks the performance hint for a large schema', () => {
      const hint = chooseUpsellHint(
        Array.from({ length: 42 }, (_, i) => model(`Model${i}`, [field('id')])),
      );

      expect(hint?.id).toBe('performance');
      expect(hint?.lines.join(' ')).toMatch(/42 models/);
    });

    it('picks nothing for a plain small schema', () => {
      // No hint is better than an irrelevant one.
      expect(chooseUpsellHint([model('User', [field('id'), field('email')])])).toBeNull();
    });

    it('does not fire the tenant hint on a single tenant-scoped model', () => {
      // One table with an orgId is not a multi-tenant application.
      expect(chooseUpsellHint([model('Setting', [field('id'), field('orgId')])])?.id).not.toBe(
        'multi-tenant',
      );
    });
  });
});
