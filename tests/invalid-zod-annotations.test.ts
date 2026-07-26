import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

/**
 * `@zod` annotations are the main way a free user customises generated validation, and they
 * are written in a doc comment where nothing type-checks them. The generator's behaviour
 * here is the good kind — it validates each annotation, says which field and which method
 * it rejected, and drops that annotation instead of emitting a `.notARealMethod(3)` that
 * would break the consumer's build. None of that was pinned by a test, so nothing stopped a
 * future change from passing the annotation straight through.
 */
describe('invalid @zod annotations', () => {
  const root = join(process.cwd(), `test-env-invalid-annotations-${process.pid}`);
  const created = join(root, 'generated', 'schemas', 'objects', 'UserCreateInput.schema.ts');
  let output = '';

  beforeAll(() => {
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
}

model User {
  id   String @id @default(cuid())
  /// @zod.notARealMethod(3)
  name String
  /// @zod.min("notanumber")
  bio  String
  /// @zod.min(3)
  ok   String
}
`,
    );

    // The generator reports these on stdout, because Prisma does not relay a generator's
    // stderr to the user.
    prismaGenerateSync(join(root, 'schema.prisma'), process.cwd());
    output = readFileSync(created, 'utf-8');
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('still generates the schema file', () => {
    // Rejecting one annotation must not abort the whole run.
    expect(existsSync(created)).toBe(true);
  });

  it('does not emit an unknown method into the schema', () => {
    // Emitting it would produce a file that cannot compile, for a typo in a comment.
    expect(output).not.toContain('notARealMethod');
  });

  it('does not emit a method whose argument is the wrong type', () => {
    expect(output).not.toContain('"notanumber"');
  });

  it('keeps the valid annotation on the neighbouring field', () => {
    // The bad annotations are skipped per field, not per model.
    expect(output).toContain('.min(3)');
  });
});
