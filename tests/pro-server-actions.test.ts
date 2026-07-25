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
