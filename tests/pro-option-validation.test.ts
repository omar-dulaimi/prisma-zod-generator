import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, rmSync } from 'fs';
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

  it(
    'warns about an option it accepts but does not act on',
    async () => {
      // enableAutoPublish is refused deliberately: publishing from a generator
      // would fire on every `prisma generate`. authConfig, packageName, version,
      // publishRegistry and includeDocumentation are all honoured as of 2.6.0.
      const output = await runSdk(
        { platforms: ['typescript'], enableAutoPublish: true },
        'inert',
      );

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
});
