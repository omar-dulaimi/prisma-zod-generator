import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..');
const COMPILE_TIMEOUT = 300_000;

/**
 * A per-field copy of a shared update-operations input has no Prisma type of its own, so
 * it binds to the one it was copied from. That claim is only worth anything if the
 * emitted file actually typechecks against a real generated client.
 */
const SCHEMA_BODY = `
model Post {
  id Int @id @default(autoincrement())

  /// [Tag]
  label String

  /// ![1 | 2]
  tier Int

  /// [Ratio]
  ratio Float

  /// [Tag]
  nickname String?

  plain String
}
`;

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe('typed JSON: the update-operations copies compile', () => {
  it(
    'binds each copy to the Prisma type it was copied from',
    () => {
      const root = join(REPO_ROOT, `test-env-tjuo-compile-${process.pid}`);
      roots.push(root);
      rmSync(root, { recursive: true, force: true });
      mkdirSync(root, { recursive: true });

      writeFileSync(
        join(root, 'schema.prisma'),
        `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
  config   = "./config.json"
}
${SCHEMA_BODY}`,
      );
      writeFileSync(
        join(root, 'config.json'),
        JSON.stringify(
          { typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' } },
          null,
          2,
        ),
      );
      writeFileSync(
        join(root, 'prisma.config.mjs'),
        `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '${join(root, 'schema.prisma')}',
  datasource: { url: 'postgresql://postgres:postgres@localhost:5432/postgres' },
});
`,
      );

      execFileSync(
        join(REPO_ROOT, 'node_modules', '.bin', 'prisma'),
        ['generate', '--config', join(root, 'prisma.config.mjs')],
        { cwd: REPO_ROOT, encoding: 'utf-8', stdio: 'pipe' },
      );

      writeFileSync(
        join(root, 'generated', 'json-types.ts'),
        `import * as z from 'zod';

export const TagSchema = z.enum(['alpha', 'beta']);
export const RatioSchema = z.number().min(0).max(1);
`,
      );

      writeFileSync(
        join(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2022',
            module: 'preserve',
            moduleResolution: 'bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            esModuleInterop: true,
            types: ['node'],
            typeRoots: [join(REPO_ROOT, 'node_modules', '@types')],
          },
          include: ['generated/**/*.ts'],
        }),
      );

      let output = '';
      try {
        execFileSync(
          join(REPO_ROOT, 'node_modules', '.bin', 'tsc'),
          ['-p', join(root, 'tsconfig.json')],
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          },
        );
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string };
        const all = `${err.stdout ?? ''}${err.stderr ?? ''}`;
        const lines = all.split('\n').filter((line) => line.includes('error TS'));
        output = `${lines.length} type error(s):\n${lines.slice(0, 10).join('\n')}`;
      }

      expect(output).toBe('');
    },
    COMPILE_TIMEOUT,
  );
});
