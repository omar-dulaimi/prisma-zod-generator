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

// A multi-word tenant-scoped model. Every model in this fixture used to be a
// single word, which is the only case where lowercasing a model name happens to
// produce Prisma's delegate name.
model ProjectVariant {
  id       String @id @default(cuid())
  label    String
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

  describe('when no model carries the configured tenant field', () => {
    /**
     * `tenantField: 'orgId'` against a schema whose models use `tenantId` left the tenant-aware model
     * list empty, and the type union was emitted as `export type TenantModelName = ;` — TS1110, a file
     * that cannot parse. The run reported success; the only hint was a warning that Prettier could not
     * format the file, which reads as a formatting hiccup rather than invalid output.
     *
     * Found by mixing packs with non-default options: multi-tenant pointed at `orgId` while the
     * policies annotations in the same schema scope by `tenantId`.
     */
    let out: string;
    let logged: string[];

    beforeAll(async () => {
      logged = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      };
      try {
        // The fixture's models all use `tenantId`, so nothing has `orgId`.
        out = await generate('field-mismatch', 'tenantId', { tenantField: 'orgId' });
      } finally {
        console.log = origLog;
      }
    }, GENERATION_TIMEOUT);

    it('does not emit a file that fails to parse', () => {
      const types = join(out, 'tenant-types.ts');
      if (existsSync(types)) {
        const source = readFileSync(types, 'utf-8');
        // An empty union is the specific shape that broke; `never` is the valid spelling.
        expect(source).not.toMatch(/export type TenantModelName\s*=\s*;/);
      }
    });

    it('says that no model has the field, naming it', () => {
      const output = logged.join('\n');
      expect(output).toMatch(/orgId/);
      expect(output.toLowerCase()).toMatch(/no .*model|not found|none of/);
    });
  });

  describe('createTenantPrismaClient', () => {
    /**
     * It called `prisma.$use(middleware)`. Prisma removed `$use` in v5 — proved against the generated
     * client's own types, where `prisma.$use(...)` is TS2339 — and this package requires Prisma 7. The
     * emitted code compiled only because the parameter is typed `any`, so the documented entry point
     * threw `TypeError: prisma.$use is not a function` on the first call for every user of the pack,
     * and `generateMiddleware` defaults to on.
     *
     * The working equivalent already existed next door: tenant-extensions.ts wires the same guard
     * through `$extends`, which is what replaced middleware.
     */
    it('scopes a client without calling the removed $use API', async () => {
      const out = await generate('middleware-entry', 'tenantId', {});
      const { createTenantPrismaClient } = await import(join(out, 'tenant-middleware.ts'));

      // A Prisma 7 client: $extends, no $use.
      const extended = { marker: 'extended' };
      const client = {
        $extends: (_ext: unknown) => extended,
        get $use() {
          throw new Error('$use was removed in Prisma 5');
        },
      };

      const scoped = createTenantPrismaClient(client, { tenantId: 'acme' });

      expect(scoped).toBe(extended);
    });

    it('says so if the middleware factory is kept for older Prisma', async () => {
      const out = await generate('middleware-doc', 'tenantId', {});
      const source = readFileSync(join(out, 'tenant-middleware.ts'), 'utf-8');

      // A function nothing can register should not read as the supported path.
      expect(source).toMatch(/\$use|removed|Prisma 5|legacy/i);
    });
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

    it('keys hooks by the Prisma delegate name, not the lowercased model name', () => {
      const source = normalized(join(defaultOut, 'tenant-extensions.ts'));

      // `Prisma.defineExtension` keys `query` by delegate name: `projectVariant`.
      // `projectvariant` is not a member of the extension type, so TypeScript
      // rejects the whole extension — and a JavaScript project gets no error and
      // no tenant isolation at all for that model, which is the dangerous case.
      expect(source).toContain('projectVariant: {');
      expect(source).not.toContain('projectvariant: {');
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
