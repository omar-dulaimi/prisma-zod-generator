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

/// @policy read:where tenantId == ctx.tenantId
model Document {
  id       String @id @default(cuid())
  title    String
  tenantId String
  userId   String
}

model Setting {
  id    String @id @default(cuid())
  key   String
  value String
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
      // Deliberately no `outputPath`: passing one here is what hid the bug. The pack defaulted to
      // './postgres/rls' relative to the process CWD and ignored the directory the CLI computes,
      // so it wrote policies.sql, migration.sql, rls-helper.ts and a README into the root of
      // whatever project ran `prisma generate` — while reporting success.
      {},
      [],
    );
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  describe('a provider that has no row-level security', () => {
    /**
     * The pack generated its full output for a MongoDB schema without a word: `policies.sql` carried
     * `ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY`, which MongoDB can never apply, and
     * `rls-helper.ts` called `$executeRaw`/`$queryRaw` — three TS2339s, because a MongoDB client has
     * neither. So a customer on MongoDB who set `enablePostgresRLS = true` received files that look
     * like security policies, cannot compile, and would never have run.
     *
     * Row-level security is PostgreSQL's (and CockroachDB's). Anything else is refused.
     */
    async function generateFor(provider: string, dirName: string) {
      const logged: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      };
      const outputPath = join(root, dirName);
      try {
        const { generatePostgresRLSFromDMMF } = await import(
          '../src/pro/features/postgres-rls/postgres-rls'
        );
        const dmmf = await getDMMF({ datamodel: SCHEMA });
        await generatePostgresRLSFromDMMF(
          dmmf,
          {},
          join(root, 'schema.prisma'),
          outputPath,
          '@prisma/client',
          provider,
          {},
          [],
        );
      } finally {
        console.log = origLog;
      }
      return { output: logged.join('\n'), outputPath };
    }

    it(
      'refuses a provider without RLS, and says which',
      async () => {
        const { output, outputPath } = await generateFor('mongodb', 'provider-mongodb');

        expect(output).toMatch(/mongodb/i);
        expect(output.toLowerCase()).toMatch(/row.level security|postgresql/);
        // Nothing should be written: the SQL is inapplicable and the helper does not compile there.
        expect(existsSync(join(outputPath, 'policies.sql'))).toBe(false);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'still generates for postgresql',
      async () => {
        const { outputPath } = await generateFor('postgresql', 'provider-postgres');

        expect(existsSync(join(outputPath, 'policies.sql'))).toBe(true);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'generates for cockroachdb, which has RLS too',
      async () => {
        const { outputPath } = await generateFor('cockroachdb', 'provider-cockroach');

        expect(existsSync(join(outputPath, 'policies.sql'))).toBe(true);
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('the emitted SQL', () => {
    // The pack's whole output is this file. It was generated with only the helper functions in it —
    // no ENABLE ROW LEVEL SECURITY, no CREATE POLICY — while the run logged "Generated RLS policies
    // for N models", because model-level `/// @policy` annotations were read with
    // parseFieldAnnotations(model, '', 'policy'): an empty field name, which matches no field. The
    // fixture had no annotations at all, so nothing here noticed.
    const sql = () => readFileSync(join(out, 'policies.sql'), 'utf-8');

    it('turns row level security on for an annotated model', () => {
      expect(sql()).toMatch(/ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY/i);
    });

    it('creates a policy from the model-level annotation', () => {
      expect(sql()).toMatch(/CREATE POLICY/i);
    });

    it('scopes the policy by the tenant column', () => {
      const text = sql();
      expect(text).toMatch(/tenantId/);
      expect(text).toMatch(/current_setting\('app\.current_tenant_id'/);
    });

    it('leaves a model with no tenant column alone', () => {
      // Setting has no tenantId, so a tenant predicate against it would be invalid SQL that fails
      // the moment the migration runs.
      const settingBlock = sql()
        .split(/\n(?=--|ALTER TABLE)/)
        .filter((chunk) => chunk.includes('"Setting"'))
        .join('\n');
      expect(settingBlock).not.toMatch(/tenantId/);
    });

    it('includes the same statements in the migration', () => {
      const migration = readFileSync(join(out, 'migration.sql'), 'utf-8');
      expect(migration).toMatch(/CREATE POLICY/i);
      expect(migration).toMatch(/BEGIN;/);
      expect(migration).toMatch(/COMMIT;/);
    });
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
