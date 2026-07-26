import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..');

/** Generating a client plus a cold tsc per configuration. */
const COMPILE_TIMEOUT = 300_000;

/**
 * The whole product is TypeScript that has to compile in the consumer's project, and
 * only two tests checked that — each pinned to one past bug (snake-case aggregates,
 * circular-dependency exclusion). No test asked the broader question: does the output
 * still compile under the documented options?
 *
 * It did not. `useMultipleFiles = false` emitted a bundle with 100 type errors, because
 * the single-file aggregator strips every relative import — including the one for the
 * Decimal helpers — and hoists a replacement for the JSON helpers but not for those.
 * Anyone generating a single file for a schema with a `Decimal` column got output that
 * could not build.
 *
 * The schema below deliberately covers the field kinds whose helpers live outside the
 * emitted schema files: Decimal, Json, Bytes, DateTime, an enum, an optional scalar and
 * a relation.
 */
const SCHEMA_BODY = `
enum Role {
  OWNER
  MEMBER
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(MEMBER)
  age       Int?
  balance   Decimal
  meta      Json?
  blob      Bytes?
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id       String  @id @default(cuid())
  title    String
  author   User?   @relation(fields: [authorId], references: [id])
  authorId String?
}
`;

/**
 * Each case is the extra lines placed inside the `generator zod` block.
 *
 * Kept to the option combinations that change the *shape* of the output — file layout,
 * which schemas exist, and which helpers have to be reachable. Options that only change
 * a single field's validator (dateTimeStrategy, decimalMode, optionalFieldBehavior,
 * strictMode, jsonSchemaCompatible, zodImportTarget) were checked by hand across the
 * same schema and all compile; they are left out to keep this suite's runtime sane.
 */
const CASES: Array<{ name: string; options: string }> = [
  { name: 'default', options: '' },
  { name: 'single-file', options: '  useMultipleFiles = false' },
  { name: 'pure-models', options: '  pureModels = true' },
  { name: 'single-file + pure-models', options: '  useMultipleFiles = false\n  pureModels = true' },
  { name: 'variants', options: '  variants = "pure,input,result"' },
  { name: 'minimal mode', options: '  mode = "minimal"' },
  { name: 'select and include', options: '  addSelectType = true\n  addIncludeType = true' },
];

const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe('generated output compiles', () => {
  /**
   * Output has to live under the repo so the emitted `zod` and `@prisma/client` imports
   * resolve, and `test-env-*` is already gitignored. The directory name carries the pid
   * so concurrent workers cannot collide.
   */
  function generate(label: string, options: string): string {
    const slug = label.replace(/[^a-z0-9]+/gi, '-');
    const root = join(REPO_ROOT, `test-env-compiles-${slug}-${process.pid}`);
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
${options}
}
${SCHEMA_BODY}`,
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

    return root;
  }

  function compile(root: string): string {
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

    try {
      execFileSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsc'), ['-p', join(root, 'tsconfig.json')], {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return '';
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string };
      const output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
      const lines = output.split('\n').filter((line) => line.includes('error TS'));
      // A single missing helper produces one error per use, so cap the message.
      return `${lines.length} type error(s):\n${lines.slice(0, 8).join('\n')}`;
    }
  }

  for (const { name, options } of CASES) {
    it(
      name,
      () => {
        expect(compile(generate(name, options))).toBe('');
      },
      COMPILE_TIMEOUT,
    );
  }
});
