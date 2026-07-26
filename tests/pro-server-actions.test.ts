import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_SERVER_ACTIONS = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'server-actions',
  'server-actions.ts',
);
const proAvailable = existsSync(PRO_SERVER_ACTIONS);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  MEMBER
}

model Member {
  id    String @id @default(cuid())
  email String @unique
  name  String?
  role  Role   @default(MEMBER)
}

model ProjectVariant {
  id    String @id @default(cuid())
  label String
}

model Project {
  id        String   @id @default(cuid())
  title     String
  budget    Decimal
  meta      Json?
  createdAt DateTime @default(now())
}
`;

/**
 * The Server Actions pack is what a Starter licence unlocks first, and it shipped
 * without the two directives that make Next.js treat its output as server
 * actions and client hooks at all.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Server Actions pack', () => {
  let dir: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(async () => {
    // Pro features require a licence; PZG_DEV_MODE is the local-development
    // bypass, and it only applies in a checkout with this submodule present.
    process.env.PZG_DEV_MODE = 'true';

    dir = mkdtempSync(join(tmpdir(), 'pzg-server-actions-'));
    const { generateServerActionsFromDMMF } = await import(
      '../src/pro/features/server-actions/server-actions'
    );
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generateServerActionsFromDMMF(
      dmmf,
      {},
      join(dir, 'schema.prisma'),
      join(dir, 'server-actions'),
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

  const read = (...parts: string[]) => readFileSync(join(dir, 'server-actions', ...parts), 'utf-8');

  it("starts every action module with the 'use server' directive", () => {
    for (const model of ['member', 'projectvariant']) {
      const source = read('actions', `${model}.ts`);
      expect(source.split('\n')[0].trim(), `actions/${model}.ts`).toBe("'use server';");
    }
  });

  it("starts every hook module with the 'use client' directive", () => {
    for (const model of ['Member', 'ProjectVariant']) {
      const source = read('hooks', `use${model}.ts`);
      expect(source.split('\n')[0].trim(), `hooks/use${model}.ts`).toBe("'use client';");
    }
  });

  it('does not put a server directive in the client hooks', () => {
    const source = read('hooks', 'useMember.ts');
    expect(source).not.toContain("'use server'");
  });

  describe('the Prisma client singleton', () => {
    /**
     * The emitted module did `new PrismaClient()` with no arguments. Prisma 7 does not allow that:
     * `url` was removed from the datasource block, and its own validation error says to "pass either
     * `adapter` for a direct database connection or `accelerateUrl` for Accelerate to the
     * PrismaClient constructor". Measured against a real v7 client: `new PrismaClient()` throws
     * `Cannot read properties of undefined (reading '__internal')`, while
     * `new PrismaClient({ adapter })` constructs fine.
     *
     * Every generated action imports this singleton, so the whole pack failed on the Prisma version
     * this repo requires — and the failure was a cryptic internal TypeError at import time rather
     * than anything a reader could act on.
     */
    it('does not construct a client with no arguments', () => {
      // Comments are excluded deliberately: the module explains what it used to do, and quoting the
      // old call is worth keeping. What matters is that no executable line constructs a client.
      const code = read('prisma-client.ts')
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');

      expect(code).not.toMatch(/new PrismaClient\(\s*\)/);
    });

    it('lets the application supply its configured client', () => {
      const source = read('prisma-client.ts');

      // The pack cannot know the caller's adapter — pg, neon, planetscale — so it has to accept one.
      expect(source).toMatch(/setPrismaClient/);
      expect(source).toMatch(/adapter/i);
    });

    it('still exports `prisma`, because every action imports it', () => {
      expect(read('prisma-client.ts')).toMatch(/export const prisma/);
      expect(read('actions', 'member.ts')).toMatch(/from '\.\.\/prisma-client'/);
    });

    it('fails with an actionable message when nothing was supplied', async () => {
      const mod = await import(join(dir, 'server-actions', 'prisma-client.ts'));

      // Touching a delegate before configuration must say what to do, not throw from Prisma's guts.
      expect(() => (mod.prisma as Record<string, unknown>).user).toThrow(/setPrismaClient/);
    });

    it('uses the client it was given', async () => {
      const mod = await import(join(dir, 'server-actions', 'prisma-client.ts'));
      const fake = { user: { findMany: () => Promise.resolve([{ id: 'u1' }]) } };

      mod.setPrismaClient(fake as never);

      expect((mod.prisma as typeof fake).user).toBe(fake.user);
    });
  });

  describe('input validation', () => {
    it('emits a Zod schema module per model', async () => {
      const schemas = await import(join(dir, 'server-actions', 'schemas', 'member.ts'));

      expect(schemas.MemberCreateInputSchema).toBeDefined();
      expect(schemas.MemberUpdateInputSchema).toBeDefined();
    });

    it('rejects input that violates the schema', async () => {
      const { MemberCreateInputSchema } = await import(
        join(dir, 'server-actions', 'schemas', 'member.ts')
      );

      // email is a required String; passing a number must fail.
      expect(MemberCreateInputSchema.safeParse({ email: 42 }).success).toBe(false);
      // Missing a required field must fail.
      expect(MemberCreateInputSchema.safeParse({}).success).toBe(false);
    });

    it('accepts valid input, treating defaulted and optional fields as optional', async () => {
      const { MemberCreateInputSchema } = await import(
        join(dir, 'server-actions', 'schemas', 'member.ts')
      );

      // `id` has a default, `name` is optional, `role` has a default — only
      // `email` is genuinely required.
      const result = MemberCreateInputSchema.safeParse({ email: 'a@b.co' });
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    });

    it('makes every field optional on the update schema', async () => {
      const { MemberUpdateInputSchema } = await import(
        join(dir, 'server-actions', 'schemas', 'member.ts')
      );

      expect(MemberUpdateInputSchema.safeParse({}).success).toBe(true);
      expect(MemberUpdateInputSchema.safeParse({ email: 42 }).success).toBe(false);
    });

    it('wires the schema into the create and update actions', () => {
      const source = read('actions', 'member.ts');

      expect(source).toContain('validateInput(MemberCreateInputSchema, data)');
      expect(source).toContain('validateInput(MemberUpdateInputSchema, data)');
      // The placeholder that stood in for validation must be gone.
      expect(source).not.toContain('TODO: Add validation');
    });

    it('emits Json and Bytes as types Prisma accepts as input', () => {
      // Assignability to Prisma's InputJsonValue is a compile-time property, so
      // it is pinned here on the emitted expression: `z.unknown()` infers
      // `unknown`, which Prisma's create/update input rejects (TS2322).
      const source = readFileSync(join(dir, 'server-actions', 'schemas', 'project.ts'), 'utf-8');

      expect(source).toContain('meta: z.any()');
      expect(source).not.toContain('z.unknown()');
    });

    it('passes the validated data to Prisma, not the raw input', () => {
      const source = read('actions', 'member.ts');

      expect(source).toContain('data: validatedData');
      expect(source).not.toMatch(/prisma\.member\.create\(\{\s*data: data\b/);
    });
  });

  it('uses the camelCase Prisma delegate for a multi-word model', () => {
    // Prisma exposes `prisma.projectVariant`, not `prisma.projectvariant`; the
    // lowercased form is undefined at runtime and fails to typecheck.
    const source = read('actions', 'projectvariant.ts');

    expect(source).toContain('prisma.projectVariant.');
    expect(source).not.toContain('prisma.projectvariant.');
  });

  describe('emitted type modules', () => {
    it('qualifies Decimal and Json through the imported Prisma namespace', () => {
      const source = read('types', 'project.ts');

      // Bare `Decimal` / `JsonValue` are not in scope — only `Prisma` is imported.
      expect(source).toContain('Prisma.Decimal');
      expect(source).toContain('Prisma.JsonValue');
      expect(source).not.toMatch(/:\s*Decimal\b/);
      expect(source).not.toMatch(/:\s*JsonValue\b/);
    });

    it('imports the enums it references', () => {
      const source = read('types', 'member.ts');
      const importLine = source.split('\n').find((line) => line.includes('@prisma/client')) ?? '';

      expect(source).toMatch(/role\??:\s*Role\b/);
      expect(importLine).toContain('Role');
    });
  });
});
