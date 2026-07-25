import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
