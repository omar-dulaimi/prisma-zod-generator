import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatFile } from '../src/utils/formatFile';

/**
 * `formatFile` resolved the user's Prettier config with
 * `prettier.resolveConfig(process.cwd())`. Prettier treats that argument as the path
 * of a *file* and searches upward from its directory, so passing a directory made it
 * start one level too high: the project's own `.prettierrc` was always skipped, and
 * only a config in some ancestor directory could ever be found.
 *
 * `prisma generate` runs at the project root, so that was every project. Every user
 * who set `formatGeneratedSchemas: true` - and every always-formatted file outside a
 * `schemas/` path - silently got the hard-coded defaults below instead of their own
 * style. It also made output depend on where the project sat on disk: a checkout
 * nested under a directory that happened to hold a `.prettierrc` picked that one up,
 * which is how it was found (a suite that was green in the repo failed in a git
 * worktree three levels below it).
 *
 * Nothing covered this, so both tests here are about *whose* config wins.
 */
describe('Prettier config resolution', () => {
  // Deliberately unlike the built-in fallback (2 spaces, semicolons, single quotes,
  // printWidth 80) so that honouring it is unmistakable.
  const CONFIG = JSON.stringify({
    tabWidth: 8,
    semi: false,
    singleQuote: false,
    printWidth: 200,
  });

  const SOURCE =
    'export const UserFindManySchema = z.object({ where: UserWhereInputSchema.optional(), take: z.number(), skip: z.number() });';

  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'pzg-prettier-config-'));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('honours a .prettierrc sitting beside the file being written', async () => {
    const projectRoot = join(root, 'beside');
    mkdirSync(projectRoot, { recursive: true });
    writeFileSync(join(projectRoot, '.prettierrc'), CONFIG);

    const output = await formatFile(SOURCE, join(projectRoot, 'schema.ts'));

    // printWidth 200 keeps it on one line, and semi:false drops the terminator.
    expect(output.trimEnd()).toBe(SOURCE.replace(/;$/, ''));
    expect(output).not.toMatch(/;\s*$/);
  });

  it('honours a .prettierrc in an ancestor of the output directory', async () => {
    const projectRoot = join(root, 'ancestor');
    const outputDir = join(projectRoot, 'src', 'generated', 'schemas');
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(projectRoot, '.prettierrc'), JSON.stringify({ tabWidth: 8, semi: false }));

    const output = await formatFile(
      'export const A = z.object({ a: z.string(), b: z.string(), c: z.string(), d: z.string(), e: z.string() });',
      join(outputDir, 'A.schema.ts'),
    );

    // At the default printWidth this wraps, so the indent reveals the tabWidth.
    expect(output).toContain('\n        a: z.string()');
    expect(output).not.toContain('\n  a: z.string()');
  });
});
