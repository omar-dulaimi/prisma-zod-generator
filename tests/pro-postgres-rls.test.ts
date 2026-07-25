import { getDMMF } from '@prisma/internals';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_RLS = join(__dirname, '..', 'src', 'pro', 'features', 'postgres-rls', 'postgres-rls.ts');
const proAvailable = existsSync(PRO_RLS);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Document {
  id       String @id @default(cuid())
  title    String
  tenantId String
  userId   String
}
`;

/** A Prisma stand-in that records raw SQL and models interactive transactions. */
function recordingPrisma() {
  const raw: Array<{ on: string; sql: string }> = [];

  const makeClient = (label: string): Record<string, unknown> => ({
    label,
    $executeRaw: (strings: TemplateStringsArray | string, ...values: unknown[]) => {
      const sql = Array.isArray(strings) ? strings.join('?') : String(strings);
      raw.push({ on: label, sql: `${sql} ${values.join(',')}`.trim() });
      return Promise.resolve(1);
    },
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(makeClient('tx')),
  });

  return { raw, client: makeClient('root') };
}

/**
 * `migration.sql` sets its GUCs with `set_config(..., true)`, which PostgreSQL
 * discards at the end of the surrounding transaction. Because setContext() issued
 * that call as a standalone statement, Prisma wrapped it in its own implicit
 * transaction and the setting was gone before the next query ran — so
 * withContext()'s callback executed with no context at all and every policy
 * evaluated against an empty current_setting(). The context has to be established
 * and used inside one interactive transaction.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('PostgreSQL RLS context', () => {
  // Output lives under the repo so the emitted `@prisma/client` import resolves.
  const root = join(process.cwd(), `test-env-postgres-rls-${process.pid}`);
  const savedDevMode = process.env.PZG_DEV_MODE;
  let out: string;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    out = join(root, 'postgres-rls');
    mkdirSync(out, { recursive: true });

    const { generatePostgresRLSFromDMMF } = await import(
      '../src/pro/features/postgres-rls/postgres-rls'
    );
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generatePostgresRLSFromDMMF(
      dmmf,
      {},
      join(root, 'schema.prisma'),
      out,
      '@prisma/client',
      'postgresql',
      { outputPath: out },
      [],
    );
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  async function helper() {
    const { createRLSHelper } = await import(join(out, 'rls-helper.ts'));
    const prisma = recordingPrisma();
    return { rls: createRLSHelper(prisma.client), prisma };
  }

  it('runs the context call and the callback in one transaction', async () => {
    const { rls, prisma } = await helper();

    await rls.withContext({ userId: 'u1', tenantId: 't1' }, async () => 'done');

    // The context statement must run on the transaction client, not the root
    // client, or PostgreSQL discards it before the callback's queries.
    expect(prisma.raw.length).toBeGreaterThan(0);
    expect(prisma.raw[0].on).toBe('tx');
  });

  it('hands the transaction client to the callback', async () => {
    const { rls } = await helper();

    const received = await rls.withContext(
      { userId: 'u1' },
      async (tx: { label?: string }) => tx?.label,
    );

    // Queries in the callback have to go through this client to see the context.
    expect(received).toBe('tx');
  });

  it('returns the callback result', async () => {
    const { rls } = await helper();

    await expect(rls.withContext({ userId: 'u1' }, async () => 42)).resolves.toBe(42);
  });

  it('still sets the context for the requested user and tenant', async () => {
    const { rls, prisma } = await helper();

    await rls.withContext({ userId: 'u1', tenantId: 't1' }, async () => null);

    const statements = prisma.raw.map((entry) => entry.sql).join('\n');
    expect(statements).toContain('set_current_user_context');
    expect(statements).toContain('u1');
    expect(statements).toContain('t1');
  });

  it('documents the transaction requirement in the generated README', () => {
    const readme = readFileSync(join(out, 'README.md'), 'utf-8');
    expect(readme.toLowerCase()).toContain('transaction');
  });
});
