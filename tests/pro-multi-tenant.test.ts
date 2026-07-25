import { getDMMF } from '@prisma/internals';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_MULTI_TENANT = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'multi-tenant-kit',
  'multi-tenant-kit.ts',
);
const proAvailable = existsSync(PRO_MULTI_TENANT);

/**
 * Emitted source with runs of whitespace collapsed.
 *
 * The generator writes through Prettier, which wraps long lines, so asserting on
 * exact single-line text is brittle: a construct can be present and correct yet
 * split across four lines.
 */
function normalized(path: string): string {
  return readFileSync(path, 'utf-8').replace(/\s+/g, ' ');
}

const schemaFor = (tenantField: string) => `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Document {
  id       String @id @default(cuid())
  title    String
  ${tenantField} String
}

model GlobalSetting {
  id    String @id @default(cuid())
  key   String @unique
  value String
}
`;

/**
 * The client extension emits real per-model query hooks that inject the tenant
 * filter — but only for models it recognises as tenant-scoped, and detection
 * ignored the documented `tenantField` option entirely. A project scoping rows by
 * `orgId` therefore got an extension with an empty hook map, empty
 * `TenantValidators`, and a `validateTenantAccess()` that threw
 * "No tenant validator found" for every model.
 *
 * (The pack's other path, `prisma.$use`, uses an API Prisma removed in v6; the
 * extension below is its replacement.)
 *
 * Output is generated under the repo so the emitted `import { Prisma } from
 * '@prisma/client'` resolves at runtime.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Multi-Tenant Kit', () => {
  // `test-env-*` is already gitignored, and output has to live under the repo so
  // the emitted `import { Prisma } from '@prisma/client'` resolves at runtime.
  const root = join(process.cwd(), `test-env-multi-tenant-${process.pid}`);
  const savedDevMode = process.env.PZG_DEV_MODE;

  async function generate(dirName: string, tenantField: string, config: Record<string, unknown>) {
    const outputPath = join(root, dirName);
    mkdirSync(outputPath, { recursive: true });

    const { generateMultiTenantKitFromDMMF } = await import(
      '../src/pro/features/multi-tenant-kit/multi-tenant-kit'
    );
    const dmmf = await getDMMF({ datamodel: schemaFor(tenantField) });

    await generateMultiTenantKitFromDMMF(
      dmmf,
      {},
      join(root, 'schema.prisma'),
      outputPath,
      '@prisma/client',
      'postgresql',
      config,
      [],
    );

    return outputPath;
  }

  let defaultOut: string;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    mkdirSync(root, { recursive: true });
    defaultOut = await generate('default', 'tenantId', {});
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  describe('the client extension', () => {
    it('registers query hooks for a tenant-scoped model', () => {
      const source = normalized(join(defaultOut, 'tenant-extensions.ts'));

      // An empty `query: {}` compiles and installs but intercepts nothing.
      expect(source).not.toMatch(/query:\s*\{\s*\}/);
      expect(source).toContain('document: {');
      for (const operation of ['create', 'findMany', 'findFirst', 'findUnique', 'update', 'delete'])
        expect(source, operation).toContain(`async ${operation}({ args, query })`);
    });

    it('injects the tenant filter into reads and the tenant id into creates', () => {
      const source = normalized(join(defaultOut, 'tenant-extensions.ts'));

      expect(source).toContain('args.where = { ...args.where, tenantId: context.tenantId }');
      expect(source).toContain('args.data = { ...args.data, tenantId: context.tenantId, }');
    });

    it('keeps the create hook assignable to Prisma’s input type', () => {
      // Prisma types `data` as an XOR of CreateInput and UncheckedCreateInput.
      // Spreading it widens the type past that constraint, so the assignment
      // fails to compile (TS2322) without an assertion back to the original type.
      const source = normalized(join(defaultOut, 'tenant-extensions.ts'));

      expect(source).toContain('} as typeof args.data;');
    });
  });

  describe('tenant-aware schemas', () => {
    it('validates the model fields rather than an unknown blob', () => {
      // `data: z.unknown()` accepted anything, so the tenant-aware schemas checked
      // only the tenant key and waved the payload through.
      const source = normalized(join(defaultOut, 'tenant-schemas.ts'));

      expect(source).not.toContain('z.unknown()');
      expect(source).toContain('title:');
    });
  });

  describe('the tenantField option', () => {
    it('detects a tenant column named something other than tenantId', async () => {
      const out = await generate('org-scoped', 'orgId', { tenantField: 'orgId' });
      const validation = normalized(join(out, 'tenant-validation.ts'));

      // With the option ignored, TenantValidators came out empty and
      // validateTenantAccess threw "No tenant validator found" for every model.
      expect(validation).toMatch(/TenantValidators\s*=\s*\{[^}]*Document/);
    });

    it('uses the configured field when scoping queries', async () => {
      const out = await generate('org-scoped-args', 'orgId', { tenantField: 'orgId' });
      const source = normalized(join(out, 'tenant-extensions.ts'));

      expect(source).toContain('args.where = { ...args.where, orgId: context.tenantId }');
    });
  });

  describe('models without a tenant column', () => {
    it('does not scope a model that has no tenant field', () => {
      const source = normalized(join(defaultOut, 'tenant-extensions.ts'));

      // GlobalSetting is shared across tenants; scoping it would return nothing.
      expect(source).toContain('document: {');
      expect(source).not.toContain('globalsetting');
    });
  });

  describe('enforceMode', () => {
    it('bakes the configured mode into the middleware default', async () => {
      const out = await generate('enforce-warn', 'tenantId', { enforceMode: 'warn' });
      const source = normalized(join(out, 'tenant-middleware.ts'));

      expect(source).toContain("enforceMode = 'warn'");
      expect(source).toContain("enforceMode === 'strict'");
    });
  });
});
