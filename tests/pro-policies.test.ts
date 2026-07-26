import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_POLICIES = join(__dirname, '..', 'src', 'pro', 'features', 'policies', 'policies.ts');
const proAvailable = existsSync(PRO_POLICIES);

const SCHEMA = `
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

/// @policy read:role in ["ADMIN", "OWNER"]
/// @policy deny:role in ["MEMBER"]
model Member {
  id       String @id @default(cuid())
  /// @pii email redact:logs
  email    String @unique
  tenantId String
  role     Role   @default(MEMBER)
}

/// @policy read:where tenantId == ctx.tenantId
model Document {
  id       String @id @default(cuid())
  title    String
  tenantId String
}

/// @policy read:where userId == ctx.userId
model Note {
  id     String @id @default(cuid())
  body   String
  userId String
}

/// @policy read:where status == "PUBLISHED"
model Article {
  id     String @id @default(cuid())
  title  String
  status String
}

/// @policy read:where tenantId == ctx.tenantId
model Invoice {
  id        String   @id @default(cuid())
  tenantId  String
  status    Role     @default(MEMBER)
  amount    Decimal
  meta      Json?
  paidAt    DateTime?
  createdAt DateTime @default(now())
}

/// @policy read:where tenantId == ctx.tenantId
model Membership {
  userId   String
  tenantId String
  label    String?

  @@id([userId, tenantId])
}
`;

/** Records the arguments Prisma would have received. */
function recordingPrisma() {
  const calls: Array<{ model: string; op: string; args: unknown }> = [];
  const delegate = (model: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) => (args: unknown) => {
          calls.push({ model, op, args });
          return Promise.resolve(op === 'findMany' ? [] : {});
        },
      },
    );

  return {
    calls,
    client: new Proxy({}, { get: (_t, model: string) => delegate(model) }),
  };
}

/**
 * Policies is sold as a security feature, so a policy that parses, emits and
 * then quietly enforces nothing is worse than one that fails loudly. Two defects
 * did exactly that: the documented `read:role in [...]` form lost its `role`
 * keyword during parsing so the generated matcher could never recognise it, and
 * the generated condition evaluator returned false unconditionally, meaning a
 * `deny:` policy was parsed, emitted, iterated and ignored.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Policies enforcement', () => {
  let dir: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    dir = mkdtempSync(join(tmpdir(), 'pzg-policies-'));

    const { generatePoliciesFromDMMF } = await import('../src/pro/features/policies/policies');
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generatePoliciesFromDMMF(
      dmmf,
      {},
      join(dir, 'schema.prisma'),
      join(dir, 'policies'),
      '@prisma/client',
      'postgresql',
      {},
      [],
    );
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  const read = (...parts: string[]) => readFileSync(join(dir, 'policies', ...parts), 'utf-8');

  describe('emitted module hygiene', () => {
    it('imports Prisma types as types', () => {
      // These names are only ever used in type positions. Importing them as
      // values fails under verbatimModuleSyntax (TS1484) and breaks any runtime
      // import, since a model type is not a real export.
      const source = read('safe-crud', 'member.ts');
      expect(source).toMatch(/^import type \{[^}]*\} from '@prisma\/client';/m);
    });

    it('imports Prisma types as types in the redaction module too', () => {
      const source = read('redaction', 'member.ts');
      expect(source).toMatch(/^import type \{[^}]*\} from '@prisma\/client';/m);
    });

    it('does not import zod where it is unused', () => {
      const source = read('safe-crud', 'member.ts');
      if (!source.includes('z.')) {
        expect(source).not.toContain("from 'zod'");
      }
    });
  });

  describe('enableRedaction: false', () => {
    /**
     * The redaction modules are emitted only when `enableRedaction` is on, but index.ts exported
     * them whenever the model had a `@pii` field — so turning redaction off produced an index
     * importing files that were never written (TS2307), and the whole pack stopped compiling.
     * Found by generating every documented value of every option and type-checking each result.
     */
    let out: string;

    beforeAll(async () => {
      const { generatePoliciesFromDMMF } = await import('../src/pro/features/policies/policies');
      const dmmf = await getDMMF({ datamodel: SCHEMA });
      out = join(dir, 'no-redaction');
      await generatePoliciesFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        out,
        '@prisma/client',
        'postgresql',
        { enableRedaction: false },
        [],
      );
    }, GENERATION_TIMEOUT);

    it('does not export a redaction module it did not write', () => {
      const index = readFileSync(join(out, 'index.ts'), 'utf-8');
      const exported = [...index.matchAll(/from '\.\/(redaction\/[^']+)'/g)].map((m) => m[1]);

      for (const target of exported) {
        expect(existsSync(join(out, `${target}.ts`)), `${target} exported but not emitted`).toBe(
          true,
        );
      }
    });

    it('still emits the safe-crud and dto modules', () => {
      expect(existsSync(join(out, 'safe-crud', 'member.ts'))).toBe(true);
      expect(existsSync(join(out, 'dto', 'member.ts'))).toBe(true);
    });
  });

  describe('read policies', () => {
    async function memberOps(context: Record<string, unknown>) {
      const { MemberSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'member.ts'));
      const prisma = recordingPrisma();
      return { ops: new MemberSafeCRUD(prisma.client, context), prisma };
    }

    it('lets a listed role through unrestricted', async () => {
      const { ops, prisma } = await memberOps({ role: 'ADMIN' });

      await ops.findMany();

      const where = (prisma.calls[0].args as { where?: Record<string, unknown> }).where ?? {};
      expect(where).toEqual({});
    });

    it('blocks a role that is not listed', async () => {
      const { ops, prisma } = await memberOps({ role: 'MEMBER' });

      await ops.findMany();

      // The generated guard narrows the query so nothing can match, using a
      // construct Prisma can actually execute: `id: -1` assumes an integer key
      // and makes Prisma throw a type error on a `String @id` model instead of
      // returning no rows.
      const where = (prisma.calls[0].args as { where?: Record<string, unknown> }).where ?? {};
      expect(where, 'an unlisted role must not receive an unfiltered query').not.toEqual({});
      expect(where).toEqual({ id: { in: [] } });
    });

    it('honours a role supplied per call, not only the constructor', async () => {
      // A server typically builds the wrapper once and varies the caller per
      // request, so reading the role from the constructor context alone locked
      // every request out.
      const { ops, prisma } = await memberOps({});

      await ops.findMany({ role: 'ADMIN' });

      const where = (prisma.calls[0].args as { where?: Record<string, unknown> }).where ?? {};
      expect(where).toEqual({});
    });

    it('injects the tenant id for a tenant-scoped model', async () => {
      const { DocumentSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'document.ts'));
      const prisma = recordingPrisma();
      const ops = new DocumentSafeCRUD(prisma.client, { tenantId: 'tenant-a' });

      await ops.findMany();

      expect((prisma.calls[0].args as { where: unknown }).where).toMatchObject({
        tenantId: 'tenant-a',
      });
    });

    it('injects the user id for an owner-scoped model', async () => {
      const { NoteSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'note.ts'));
      const prisma = recordingPrisma();
      const ops = new NoteSafeCRUD(prisma.client, { userId: 'user-1' });

      await ops.findMany();

      expect((prisma.calls[0].args as { where: unknown }).where).toMatchObject({
        userId: 'user-1',
      });
    });
  });

  describe('a scoped read denies when the context is missing', () => {
    async function opsFor(model: string, context: Record<string, unknown>) {
      const file = join(dir, 'policies', 'safe-crud', `${model.toLowerCase()}.ts`);
      const exported = (await import(file)) as Record<string, new (...args: unknown[]) => unknown>;
      const prisma = recordingPrisma();
      const ctor = exported[`${model}SafeCRUD`];
      return {
        ops: new ctor(prisma.client, context) as { findMany: (c?: unknown) => Promise<unknown> },
        prisma,
      };
    }

    function whereOf(prisma: { calls: { args: unknown }[] }) {
      return ((prisma.calls[0].args as { where?: Record<string, unknown> }).where ?? {}) as Record<
        string,
        unknown
      >;
    }

    it('filters by tenant when the context carries one', async () => {
      const { ops, prisma } = await opsFor('Document', { tenantId: 'acme' });

      await ops.findMany();

      expect(whereOf(prisma)).toEqual({ tenantId: 'acme' });
    });

    it('matches nothing when the tenant is absent, rather than everything', async () => {
      // This emitted `{ tenantId: context.tenantId }` unconditionally, and Prisma strips
      // `undefined` from a where clause — so the filter vanished and the query read every
      // tenant's rows. The call site still looked scoped, which is what made it dangerous.
      const { ops, prisma } = await opsFor('Document', {});

      await ops.findMany();

      const where = whereOf(prisma);
      expect(where).not.toEqual({});
      expect(where.id).toEqual({ in: [] });
    });

    it('matches nothing when the user is absent', async () => {
      const { ops, prisma } = await opsFor('Note', {});

      await ops.findMany();

      expect(whereOf(prisma).id).toEqual({ in: [] });
    });

    it('filters by user when the context carries one', async () => {
      const { ops, prisma } = await opsFor('Note', { userId: 'u_1' });

      expect(
        whereOf(
          await (async () => {
            await ops.findMany();
            return prisma;
          })(),
        ),
      ).toEqual({
        userId: 'u_1',
      });
    });
  });

  describe('write policies', () => {
    it('scopes a delete with the model read policies', async () => {
      // Read policies constrain what a caller can see; a delete that ignores them
      // lets that caller remove rows they were never allowed to read.
      const { DocumentSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'document.ts'));
      const prisma = recordingPrisma();
      const ops = new DocumentSafeCRUD(prisma.client, { tenantId: 'tenant-a' });

      await ops.delete({ tenantId: 'tenant-a' }, { where: { id: 'doc-1' } });

      expect((prisma.calls[0].args as { where: unknown }).where).toMatchObject({
        id: 'doc-1',
        tenantId: 'tenant-a',
      });
    });

    it('scopes an update the same way', async () => {
      const { DocumentSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'document.ts'));
      const prisma = recordingPrisma();
      const ops = new DocumentSafeCRUD(prisma.client, { tenantId: 'tenant-a' });

      await ops.update({ tenantId: 'tenant-a' }, { where: { id: 'doc-1' }, data: { title: 'x' } });

      expect((prisma.calls[0].args as { where: unknown }).where).toMatchObject({
        tenantId: 'tenant-a',
      });
    });
  });

  describe('a policy the evaluator cannot enforce', () => {
    // The parser accepts any condition text after `read:where`, but the generated evaluator
    // implements exactly three forms: `role in [...]`, `userId == ctx.userId` and
    // `tenantId == ctx.tenantId`. Anything else used to fall through to `return where` — parsed,
    // emitted, iterated, and enforcing nothing, with the query left unscoped and no warning at
    // any point. Article carries `read:where status == "PUBLISHED"`, which is not one of the three.
    it('refuses the query instead of running it unscoped', async () => {
      const { ArticleSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'article.ts'));
      const prisma = recordingPrisma();
      const ops = new ArticleSafeCRUD(prisma.client, {}) as { findMany: () => Promise<unknown> };

      // The message has to name the offending condition and the forms that do work, because the
      // fix is a schema edit and the annotation text is the only way to find it.
      await expect(ops.findMany()).rejects.toThrow(/cannot be enforced.*PUBLISHED/s);
      await expect(ops.findMany()).rejects.toThrow(/tenantId == ctx\.tenantId/);
      // Reaching Prisma at all would mean the unscoped read happened.
      expect(prisma.calls).toHaveLength(0);
    });

    it('still enforces the policies it does understand', async () => {
      // The throw must be confined to the unenforceable condition. A model whose policy is
      // supported has to keep working, and an allowed role still reads unrestricted.
      const { MemberSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'member.ts'));
      const prisma = recordingPrisma();
      const ops = new MemberSafeCRUD(prisma.client, { role: 'ADMIN' }) as {
        findMany: () => Promise<unknown>;
      };

      await expect(ops.findMany()).resolves.toBeDefined();
      expect(prisma.calls).toHaveLength(1);
    });

    it('warns at generation time, naming the model and the condition', async () => {
      // The runtime throw is the backstop; this is the part that reaches someone while they can
      // still fix the schema. Without it the first sign is a failing query in a running app.
      const { generatePoliciesFromDMMF } = await import('../src/pro/features/policies/policies');
      const logs: string[] = [];
      const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });

      const target = mkdtempSync(join(tmpdir(), 'pzg-policies-warn-'));
      try {
        const dmmf = await getDMMF({ datamodel: SCHEMA });
        await generatePoliciesFromDMMF(
          dmmf,
          {},
          join(target, 'schema.prisma'),
          join(target, 'policies'),
          '@prisma/client',
          'postgresql',
          {},
          [],
        );
      } finally {
        spy.mockRestore();
        rmSync(target, { recursive: true, force: true });
      }

      const warnings = logs.filter((line) => line.includes('cannot be enforced'));
      expect(warnings.length, logs.join('\n')).toBeGreaterThan(0);
      expect(logs.join('\n')).toContain('Article');
      expect(logs.join('\n')).toContain('PUBLISHED');
    });
  });

  describe('a deny policy rejects a write', () => {
    // The generated README says `create` and `update` throw when a `deny:` policy matches. That
    // sentence is only worth shipping if it is true, so it is asserted here. Member carries
    // `deny:role in ["MEMBER"]`; the condition is evaluated against the caller's context.
    async function memberCrud(context: Record<string, unknown>) {
      const { MemberSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'member.ts'));
      const prisma = recordingPrisma();
      return {
        ops: new MemberSafeCRUD(prisma.client, context) as {
          create: (c: unknown, a: unknown) => Promise<unknown>;
          update: (c: unknown, a: unknown) => Promise<unknown>;
        },
        prisma,
      };
    }

    it('throws on create for a denied role, and does not reach prisma', async () => {
      const { ops, prisma } = await memberCrud({ role: 'MEMBER' });

      await expect(
        ops.create({ role: 'MEMBER' }, { data: { email: 'a@b.c', role: 'MEMBER' } }),
      ).rejects.toThrow(/Policy violation/);
      // Throwing after the row was written would be the worst of both worlds.
      expect(prisma.calls).toHaveLength(0);
    });

    it('throws on update for a denied role', async () => {
      const { ops } = await memberCrud({ role: 'MEMBER' });

      await expect(
        ops.update({ role: 'MEMBER' }, { where: { id: 'm1' }, data: { email: 'a@b.c' } }),
      ).rejects.toThrow(/Policy violation/);
    });

    it('allows the write for a role the deny policy does not name', async () => {
      const { ops, prisma } = await memberCrud({ role: 'ADMIN' });

      await ops.create({ role: 'ADMIN' }, { data: { email: 'a@b.c', role: 'MEMBER' } });

      expect(prisma.calls).toHaveLength(1);
    });
  });

  describe('redaction', () => {
    async function redactor() {
      const { MemberRedactor } = await import(join(dir, 'policies', 'redaction', 'member.ts'));
      return new MemberRedactor();
    }

    it('masks a @pii field by default', async () => {
      // The default context was 'api', which shouldRedactField never matched, so
      // the redactor returned its input untouched.
      const result = (await redactor()).redact({
        id: 'm1',
        email: 'someone@example.com',
        tenantId: 't1',
        role: 'MEMBER',
      });

      expect(result.email).not.toBe('someone@example.com');
    });

    it('still masks for an explicit logs context', async () => {
      const result = (await redactor()).redact(
        { id: 'm1', email: 'someone@example.com', tenantId: 't1', role: 'MEMBER' },
        'logs',
      );

      expect(result.email).not.toBe('someone@example.com');
    });

    it('leaves non-PII fields alone', async () => {
      const result = (await redactor()).redact({
        id: 'm1',
        email: 'someone@example.com',
        tenantId: 't1',
        role: 'MEMBER',
      });

      expect(result.tenantId).toBe('t1');
      expect(result.role).toBe('MEMBER');
    });

    it('refuses to hand back unredacted data from the barrel helper', async () => {
      // `redactPII` returned its input unchanged with a "placeholder" comment. A
      // caller reaching for that name is trying to protect PII, so silently
      // returning it is the one outcome that must not happen.
      const { redactPII } = await import(join(dir, 'policies', 'index.ts'));

      expect(() => redactPII({ email: 'someone@example.com' })).toThrow(/Redactor/);
    });

    it('uses the configured context as the default', async () => {
      // RedactionConfig was stored on the instance and never read, so `context`
      // did nothing at all.
      const { MemberRedactor } = await import(join(dir, 'policies', 'redaction', 'member.ts'));
      const source = read('redaction', 'member.ts');

      expect(source).toContain('this.config.context');
      expect(new MemberRedactor({ context: 'logs' }).redact({ email: 'a@b.co' }).email).not.toBe(
        'a@b.co',
      );
    });

    it('redacts the body the Express middleware passes through', async () => {
      const { createMemberRedactionMiddleware } = await import(
        join(dir, 'policies', 'redaction', 'member.ts')
      );

      let sent: { email?: string } = {};
      const res = { json: (body: unknown) => (sent = body as { email?: string }) };
      const middleware = createMemberRedactionMiddleware();

      middleware({}, res, () => {});
      res.json({ id: 'm1', email: 'someone@example.com', tenantId: 't1', role: 'MEMBER' });

      expect(sent.email).not.toBe('someone@example.com');
    });
  });

  describe('DTO schemas', () => {
    it('loads a model with an enum field', async () => {
      // The enum was referenced as a bare name with no import, so the module
      // threw ReferenceError the moment anything imported it.
      const dto = await import(join(dir, 'policies', 'dto', 'invoice.ts'));
      expect(dto.InvoiceCreateInputSchema).toBeDefined();
    });

    it('validates an enum field against its members', async () => {
      const { InvoiceCreateInputSchema } = await import(join(dir, 'policies', 'dto', 'invoice.ts'));

      expect(InvoiceCreateInputSchema.safeParse({ tenantId: 't1', amount: 5 }).success).toBe(true);
      expect(
        InvoiceCreateInputSchema.safeParse({ tenantId: 't1', amount: 5, status: 'NOPE' }).success,
      ).toBe(false);
    });

    it('parses a row from a model without createdAt or updatedAt', async () => {
      // Create/Update schemas hardcoded .omit({ id, createdAt, updatedAt }); under
      // zod 4 omitting a key the object does not have throws at first use.
      const { MembershipCreateInputSchema, MembershipUpdateInputSchema } = await import(
        join(dir, 'policies', 'dto', 'membership.ts')
      );

      expect(() =>
        MembershipCreateInputSchema.parse({ userId: 'u1', tenantId: 't1' }),
      ).not.toThrow();
      expect(() => MembershipUpdateInputSchema.parse({ label: 'x' })).not.toThrow();
    });

    it('accepts null for a nullable column, as Prisma returns it', async () => {
      // Nullable columns were emitted .optional() (accepting undefined) and never
      // .nullable(), so parsing a real Prisma row failed on any null value.
      const { InvoiceCreateInputSchema } = await import(join(dir, 'policies', 'dto', 'invoice.ts'));

      const result = InvoiceCreateInputSchema.safeParse({
        tenantId: 't1',
        amount: 5,
        paidAt: null,
        meta: null,
      });
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    });

    it('accepts a Decimal-like value for a Decimal column', async () => {
      // Decimal was mapped to z.number(), which rejects the Prisma.Decimal
      // instance a real row carries.
      const { InvoiceCreateInputSchema } = await import(join(dir, 'policies', 'dto', 'invoice.ts'));

      expect(InvoiceCreateInputSchema.safeParse({ tenantId: 't1', amount: '12.34' }).success).toBe(
        true,
      );
    });
  });

  describe('deny policies', () => {
    async function create(context: Record<string, unknown>) {
      const { MemberSafeCRUD } = await import(join(dir, 'policies', 'safe-crud', 'member.ts'));
      const prisma = recordingPrisma();
      const ops = new MemberSafeCRUD(prisma.client, {});
      return ops.create(context, { data: { email: 'a@b.co', tenantId: 't1' } });
    }

    it('rejects a create from a denied role', async () => {
      await expect(create({ role: 'MEMBER' })).rejects.toThrow(/policy/i);
    });

    it('allows a create from a role that is not denied', async () => {
      await expect(create({ role: 'ADMIN' })).resolves.toBeDefined();
    });
  });
});
