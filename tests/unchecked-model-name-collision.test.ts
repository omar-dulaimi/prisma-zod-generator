import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * Two models named `Order` and `OrderUnchecked` make Prisma emit two DIFFERENT input types
 * that share one name. Measured from the DMMF, not inferred:
 *
 *   OrderUncheckedCreateInput: 2 defs -> [id,label]  VS  [label]
 *   OrderUncheckedUpdateInput: 2 defs -> [id,label]  VS  [label]
 *
 * The ambiguity is upstream, in Prisma's own naming, so PZG cannot resolve it by reading the
 * model name more carefully: one name genuinely denotes two types. PZG writes one file per
 * input-type name, so whichever is emitted last silently wins and one model's create input
 * ends up describing the other model's columns. With a `@zod` or typed-JSON annotation on
 * either, one model's validation is enforced on the other model's column.
 *
 * The honest response is to say so at generation time rather than to guess. This pins the
 * warning, and pins the surrounding behaviour so the collision cannot widen unnoticed: an
 * unaffected model in the same schema must still generate correctly.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-unchecked-collision-${process.pid}`);
const out = join(root, 'generated', 'schemas');

const SCHEMA_BODY = `
model Order {
  id    Int    @id @default(autoincrement())
  /// @zod.min(4)
  label String
}

/// Its name is another model's name plus "Unchecked", which is what creates the collision.
model OrderUnchecked {
  id    Int    @id @default(autoincrement())
  /// @zod.max(2)
  label String
}

/// Untouched by the collision and must stay that way.
model Item {
  id   Int    @id @default(autoincrement())
  /// @zod.min(4)
  name String
}
`;

let stderr = '';

function generate(): string {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  writeFileSync(join(root, 'config.json'), JSON.stringify({}, null, 2));
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
  output   = "${out}"
  config   = "${join(root, 'config.json')}"
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

  const result = execFileSync(
    join(REPO_ROOT, 'node_modules', '.bin', 'prisma'),
    ['generate', '--config', join(root, 'prisma.config.mjs')],
    { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
  return result;
}

beforeAll(() => {
  try {
    stderr = generate();
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    stderr = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}, GENERATION_TIMEOUT);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('a model whose name is another model plus "Unchecked"', () => {
  it('warns that the input-type name is ambiguous', () => {
    expect(stderr).toMatch(/OrderUncheckedCreateInput/);
    expect(stderr.toLowerCase()).toMatch(/ambiguous|collision|collide/);
  });

  it('names both models in the warning so the fix is obvious', () => {
    expect(stderr).toMatch(/Order\b/);
    expect(stderr).toMatch(/OrderUnchecked\b/);
  });

  it('still generates, rather than failing the build', () => {
    // A warning, not an error. The schema is legal Prisma and the user may not care.
    expect(existsSync(join(out, 'objects', 'OrderUncheckedCreateInput.schema.ts'))).toBe(true);
  });

  it('leaves an unaffected model in the same schema correct', () => {
    const item = readFileSync(join(out, 'objects', 'ItemCreateInput.schema.ts'), 'utf-8');
    expect(item).toContain('min(4)');
    expect(stderr).not.toMatch(/Item\w*Input.*(ambiguous|collision)/i);
  });
});
