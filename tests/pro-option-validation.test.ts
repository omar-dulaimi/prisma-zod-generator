import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_SDK = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'sdk-publisher',
  'sdk-publisher.ts',
);
const proAvailable = existsSync(PRO_SDK);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Invoice {
  id     String @id @default(cuid())
  title  String
}
`;

/**
 * No pack validated its options. A typo was discarded in silence, and several
 * documented keys were accepted while doing nothing at all — six of SDK
 * Publisher's eight, including the whole authConfig union behind its "Bearer, API
 * Key, OAuth2" claim, and seven of API Docs' seventeen, so openApiVersion could
 * never produce 3.1. Configuring something and having it ignored without a word
 * is the worst of the options: it looks like it worked.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Pro option validation', () => {
  let dir: string;
  const savedDevMode = process.env.PZG_DEV_MODE;
  let logged: string[];

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    dir = mkdtempSync(join(tmpdir(), 'pzg-options-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  async function runSdk(config: Record<string, unknown>, label: string) {
    logged = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });

    const { generateSDKFromDMMF } = await import('../src/pro/features/sdk-publisher/sdk-publisher');
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generateSDKFromDMMF(
      dmmf,
      {},
      join(dir, 'schema.prisma'),
      join(dir, label),
      '@prisma/client',
      'postgresql',
      config,
      [],
    );

    return logged.join('\n');
  }

  /**
   * Options that were listed as supported while nothing read them.
   *
   * Found by generating every pack under every documented value of every option and hashing the
   * output: a config whose output is byte-identical to the default is an option that does nothing.
   * Six survived that way, each defaulted and advertised, none consulted. Silence is the worst
   * outcome here — the setting looks applied.
   */
  describe('option values that are the wrong shape', () => {
    /**
     * Three cases where a wrong value was accepted and acted on rather than rejected. Each produces
     * no error, a zero exit code, and output that is either missing or broken.
     */
    it(
      'rejects a bare string where a platform list belongs',
      async () => {
        // `platforms: 'typescript'` was iterated character by character: ten warnings reading
        // "Platform t not yet implemented", "Platform y ...", then "Generated SDKs for 10 platforms"
        // and no files at all.
        const output = await runSdk({ platforms: 'typescript' as never }, 'platforms-string');

        expect(output).not.toMatch(/Platform [ty] not yet implemented/);
        expect(output.toLowerCase()).toMatch(/array|list/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'says so when the platform list is empty',
      async () => {
        // Generated nothing, warned about nothing, exited 0.
        const output = await runSdk({ platforms: [] }, 'platforms-empty');

        expect(output.toLowerCase()).toMatch(/no platform|empty/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'reports an action it does not implement',
      async () => {
        const captured: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...args) => {
          captured.push(args.join(' '));
        });

        const { generateServerActionsFromDMMF } = await import(
          '../src/pro/features/server-actions/server-actions'
        );
        const dmmf = await getDMMF({ datamodel: SCHEMA });
        const out = join(dir, 'bogus-actions');

        await generateServerActionsFromDMMF(
          dmmf,
          {},
          join(dir, 'schema.prisma'),
          out,
          '@prisma/client',
          'postgresql',
          { actions: ['upsert', 'createMany'] },
          [],
        );

        const output = captured.join('\n');
        expect(output).toMatch(/upsert|createMany/);
        expect(output.toLowerCase()).toMatch(/not implemented|not supported|unknown/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'does not emit a hook that imports nothing',
      async () => {
        // With only unsupported actions, every action body was skipped but the hook was still
        // emitted, containing `import {  } from '../actions/invoice'` and referencing nothing.
        const { generateServerActionsFromDMMF } = await import(
          '../src/pro/features/server-actions/server-actions'
        );
        const dmmf = await getDMMF({ datamodel: SCHEMA });
        const out = join(dir, 'bogus-actions-files');

        await generateServerActionsFromDMMF(
          dmmf,
          {},
          join(dir, 'schema.prisma'),
          out,
          '@prisma/client',
          'postgresql',
          { actions: ['upsert'] },
          [],
        );

        const hooks = join(out, 'hooks');
        if (existsSync(hooks)) {
          for (const name of readdirSync(hooks)) {
            expect(
              readFileSync(join(hooks, name), 'utf-8'),
              `${name} has an empty import`,
            ).not.toMatch(/import \{\s*\} from/);
          }
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('options that were accepted and ignored', () => {
    /**
     * A schema with a tenant column, for the packs that need one. The shared fixture above has no
     * `tenantId`, so the Multi-Tenant Kit finds nothing tenant-aware and — correctly — generates
     * nothing at all, which is not what the enableGuards assertion is about.
     */
    const TENANT_SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Invoice {
  id       String @id @default(cuid())
  tenantId String
  title    String
}
`;

    async function run(
      moduleSuffix: string,
      fn: string,
      config: Record<string, unknown>,
      label: string,
      datamodel: string = SCHEMA,
    ) {
      const captured: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => {
        captured.push(args.join(' '));
      });

      const mod = (await import(`../src/pro/${moduleSuffix}`)) as Record<string, unknown>;
      const generate = mod[fn] as (...args: unknown[]) => Promise<void>;
      const dmmf = await getDMMF({ datamodel });
      const out = join(dir, label);

      await generate(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        out,
        '@prisma/client',
        'postgresql',
        config,
        [],
      );

      return { output: captured.join('\n'), out };
    }

    it(
      'says so when asked for yup, which is not implemented',
      async () => {
        // `validation` was never read: 'yup' emitted byte-identical zod output. Falling back is
        // right — the forms work — but doing it silently is not.
        const { output } = await run(
          'features/form-ux/form-ux',
          'generateFormUXFromDMMF',
          { validation: 'yup' },
          'form-yup',
        );

        expect(output).toMatch(/yup/i);
        expect(output.toLowerCase()).toMatch(/not (implemented|supported)|no effect|zod/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'honours defaultValues: false by omitting the defaults block',
      async () => {
        const off = await run(
          'features/form-ux/form-ux',
          'generateFormUXFromDMMF',
          { defaultValues: false },
          'form-nodefaults',
        );
        const on = await run(
          'features/form-ux/form-ux',
          'generateFormUXFromDMMF',
          { defaultValues: true },
          'form-defaults',
        );

        const read = (base: string) =>
          readFileSync(join(base, 'components', 'InvoiceForm.tsx'), 'utf-8');

        // The whole point of the flag is that the caller supplies its own initial values.
        expect(read(on.out)).toMatch(/defaultValues:\s*\{/);
        expect(read(off.out)).not.toMatch(/defaultValues:\s*\{\s*\w/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'says so when asked for the prisma migration format',
      async () => {
        const { output } = await run(
          'features/postgres-rls/postgres-rls',
          'generatePostgresRLSFromDMMF',
          { migrationFormat: 'prisma' },
          'rls-prisma-format',
        );

        expect(output).toMatch(/migrationFormat|prisma/i);
        expect(output.toLowerCase()).toMatch(/not (implemented|supported)|no effect|sql/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'says so when asked for audit logging',
      async () => {
        const { output } = await run(
          'features/postgres-rls/postgres-rls',
          'generatePostgresRLSFromDMMF',
          { enableAuditLogging: true },
          'rls-audit',
        );

        expect(output).toContain('enableAuditLogging');
        expect(output.toLowerCase()).toMatch(/no effect|not implemented/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'says so when asked for error boundaries',
      async () => {
        // Every generated action already wraps its body in try/catch and returns a typed error.
        // What this option promised — emitted React error-boundary components — does not exist.
        const { output } = await run(
          'features/server-actions/server-actions',
          'generateServerActionsFromDMMF',
          { enableErrorBoundaries: false },
          'sa-no-boundaries',
        );

        expect(output).toContain('enableErrorBoundaries');
        expect(output.toLowerCase()).toMatch(/no effect|not implemented/);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'treats enableGuards as the alias it is documented to be',
      async () => {
        // The comment on the field says "Back-compat alias"; nothing read it. The guards it refers to
        // are the $extends helpers in tenant-extensions.ts, which generatePrismaExtension gates.
        //
        // Middleware is turned off alongside it here because the two are no longer independent:
        // createTenantPrismaClient in the middleware module goes through withEnhancedTenantGuard,
        // since Prisma removed the $use API it used to register on. Turning the guard off while
        // asking for middleware therefore cannot remove the guard — see the next test.
        const off = await run(
          'features/multi-tenant-kit/multi-tenant-kit',
          'generateMultiTenantKitFromDMMF',
          { enableGuards: false, generateMiddleware: false },
          'mt-no-guards',
          TENANT_SCHEMA,
        );

        expect(existsSync(join(off.out, 'tenant-extensions.ts'))).toBe(false);

        const on = await run(
          'features/multi-tenant-kit/multi-tenant-kit',
          'generateMultiTenantKitFromDMMF',
          { enableGuards: true },
          'mt-guards',
          TENANT_SCHEMA,
        );

        expect(existsSync(join(on.out, 'tenant-extensions.ts'))).toBe(true);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'keeps the guard when middleware needs it, and says why',
      async () => {
        // Emitting the middleware without the guard it imports would leave a dangling import — the
        // same breakage the other packs' flags used to produce. The guard wins, with an explanation.
        const { output, out } = await run(
          'features/multi-tenant-kit/multi-tenant-kit',
          'generateMultiTenantKitFromDMMF',
          { generatePrismaExtension: false, generateMiddleware: true },
          'mt-conflict',
          TENANT_SCHEMA,
        );

        expect(existsSync(join(out, 'tenant-extensions.ts'))).toBe(true);
        expect(output).toMatch(/generatePrismaExtension/);
        expect(output).toMatch(/tenant-middleware|imports/i);
      },
      GENERATION_TIMEOUT,
    );
  });

  it(
    'warns about an option it accepts but does not act on',
    async () => {
      // enableAutoPublish is refused deliberately: publishing from a generator
      // would fire on every `prisma generate`. authConfig, packageName, version,
      // publishRegistry and includeDocumentation are all honoured as of 2.6.0.
      const output = await runSdk({ platforms: ['typescript'], enableAutoPublish: true }, 'inert');

      expect(output).toContain('enableAutoPublish');
      expect(output.toLowerCase()).toMatch(/no effect|not implemented|ignored/);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'warns about a key it does not recognise at all',
    async () => {
      const output = await runSdk({ platforms: ['typescript'], platfroms: ['python'] }, 'typo');

      expect(output).toContain('platfroms');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'stays quiet when every option is honoured',
    async () => {
      const output = await runSdk({ platforms: ['typescript'], outputPath: join(dir, 'ok') }, 'ok');

      expect(output).not.toMatch(/no effect|not implemented|unknown option/i);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'reports api-docs options that are declared but never read',
    async () => {
      logged = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => {
        logged.push(args.join(' '));
      });

      const { generateAPIDocsFromDMMF } = await import('../src/pro/features/api-docs/api-docs');
      const dmmf = await getDMMF({ datamodel: SCHEMA });

      await generateAPIDocsFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        join(dir, 'api-docs-opts'),
        '@prisma/client',
        'postgresql',
        { startMockServer: true, title: 'Billing API' },
        [],
      );

      const output = logged.join('\n');
      // startMockServer is refused: a server started during `prisma generate`
      // would leave a long-running process attached to the generator.
      expect(output).toContain('startMockServer');
      // Options that are honoured must not be reported.
      expect(output).not.toMatch(/no effect yet:.*title/);
      expect(output).not.toContain('openApiVersion');
    },
    GENERATION_TIMEOUT,
  );

  /**
   * Only four of the eleven packs validated their options, so a mistyped key still
   * vanished in silence in the other seven — the guarantee is only worth anything
   * if it holds everywhere.
   */
  describe.each([
    [
      'server-actions',
      '../src/pro/features/server-actions/server-actions',
      'generateServerActionsFromDMMF',
    ],
    ['form-ux', '../src/pro/features/form-ux/form-ux', 'generateFormUXFromDMMF'],
    [
      'postgres-rls',
      '../src/pro/features/postgres-rls/postgres-rls',
      'generatePostgresRLSFromDMMF',
    ],
    [
      'multi-tenant-kit',
      '../src/pro/features/multi-tenant-kit/multi-tenant-kit',
      'generateMultiTenantKitFromDMMF',
    ],
  ])('%s', (pack, modulePath, exportName) => {
    it(
      'reports an unrecognised option',
      async () => {
        const logged: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...args) => {
          logged.push(args.join(' '));
        });

        const mod = (await import(modulePath)) as Record<string, unknown>;
        const generate = mod[exportName] as (...args: unknown[]) => Promise<void>;
        const dmmf = await getDMMF({ datamodel: SCHEMA });

        await generate(
          dmmf,
          {},
          join(dir, 'schema.prisma'),
          join(dir, `opts-${pack}`),
          '@prisma/client',
          'postgresql',
          { deffinitelyNotAnOption: true, outputPath: join(dir, `opts-${pack}`) },
          [],
        );

        expect(logged.join('\n')).toContain('deffinitelyNotAnOption');
      },
      GENERATION_TIMEOUT,
    );
  });

  it(
    'names the options it does support when it warns',
    async () => {
      const output = await runSdk({ platforms: ['typescript'], nonsense: true }, 'lists');

      // Assert on the warning line itself: 'platforms' also appears in the
      // generator's ordinary progress output, which would pass vacuously.
      const warning = output.split('\n').find((line) => line.includes('nonsense')) ?? '';
      expect(warning).toContain('Supported:');
      expect(warning).toContain('platforms');
    },
    GENERATION_TIMEOUT,
  );

  /**
   * These two packs are plain functions rather than ProFeatureBase subclasses, so
   * they use the standalone reporter — the guarantee has to hold for all eleven,
   * not just the nine that happen to be classes.
   */
  describe.each([
    [
      'data-factories',
      '../src/pro/features/data-factories/data-factories',
      'generateDataFactories',
    ],
    [
      'performance-pack',
      '../src/pro/features/performance-pack/performance-pack',
      'generatePerformancePack',
    ],
  ])('%s', (pack, modulePath, exportName) => {
    it(
      'reports an unrecognised option',
      async () => {
        const logged: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...args) => {
          logged.push(args.join(' '));
        });

        const schemaPath = join(dir, 'schema.prisma');
        writeFileSync(schemaPath, SCHEMA);

        const mod = (await import(modulePath)) as Record<string, unknown>;
        const generate = mod[exportName] as (path: string, config: unknown) => Promise<void>;

        await generate(schemaPath, {
          outputPath: join(dir, `fn-opts-${pack}`),
          deffinitelyNotAnOption: true,
        });

        expect(logged.join('\n')).toContain('deffinitelyNotAnOption');
      },
      GENERATION_TIMEOUT,
    );
  });
});
