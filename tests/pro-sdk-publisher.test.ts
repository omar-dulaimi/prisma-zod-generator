import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

enum Role {
  OWNER
  ADMIN
  MEMBER
}

model Invoice {
  id       String   @id @default(cuid())
  /// The public invoice title.
  /// Shown in the dashboard header.
  title    String
  amount   Decimal
  meta     Json?
  document Bytes?
  role     Role     @default(MEMBER)
  dueAt    DateTime?
}
`;

/**
 * The SDK is a standalone HTTP client: it has no Prisma dependency, so it cannot
 * name Prisma's types. It emitted `Decimal`, `JsonValue` and `Buffer` with zero
 * imports (TS2304), declared enums without values so a comparison against a JSON
 * payload was always false, and appended a multi-line `///` comment after a `//`
 * marker, dropping the continuation into code position and breaking the file.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('SDK Publisher client', () => {
  let dir: string;
  let source: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    dir = mkdtempSync(join(tmpdir(), 'pzg-sdk-'));

    const { generateSDKFromDMMF } = await import('../src/pro/features/sdk-publisher/sdk-publisher');
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generateSDKFromDMMF(
      dmmf,
      {},
      join(dir, 'schema.prisma'),
      join(dir, 'sdk'),
      '@prisma/client',
      'postgresql',
      { platforms: ['typescript'] },
      [],
    );

    source = readFileSync(join(dir, 'sdk', 'typescript', 'index.ts'), 'utf-8');
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  it('names no type it does not define or import', () => {
    // These are Prisma runtime types. A standalone client has no access to them.
    for (const name of ['Decimal', 'JsonValue', 'Buffer']) {
      expect(source, `${name} is referenced but never declared`).not.toMatch(
        new RegExp(`:\\s*${name}\\b`),
      );
    }
  });

  it('maps Decimal, Json and Bytes to wire-friendly types', () => {
    expect(source).toMatch(/amount:\s*(string \| number|number \| string)/);
    expect(source).toMatch(/meta\?:\s*unknown/);
    expect(source).toMatch(/document\?:\s*string/);
  });

  it('types a date as what JSON actually carries', () => {
    // A `Date` annotation is a lie over HTTP: JSON.parse yields an ISO string, so
    // calling dueAt.getTime() on the result throws at runtime.
    expect(source).toMatch(/dueAt\?:\s*string/);
  });

  it('gives enum members string values so JSON comparisons work', () => {
    // A valueless `enum Role { OWNER }` is numeric, so `role === Role.OWNER`
    // compares a string from the API against 0 and is always false.
    expect(source).toMatch(/OWNER\s*=\s*'OWNER'/);
    expect(source).toMatch(/ADMIN\s*=\s*'ADMIN'/);
  });

  it('keeps a multi-line field comment out of code position', () => {
    const lines = source.split('\n');
    const stray = lines.find((line) => line.trim() === 'Shown in the dashboard header.');

    expect(stray, 'a comment continuation leaked into code position').toBeUndefined();
  });

  it('still emits the client and its methods', () => {
    expect(source).toContain('export class APIClient');
    expect(source).toContain('async listInvoices()');
  });

  /**
   * Six of the eight SDKConfig options were declared, defaulted and never read —
   * including the whole authConfig union behind the pack's "Bearer, API Key,
   * OAuth2" claim, and packageName/version, which is what makes something a
   * publishable package rather than a loose file.
   */
  describe('configuration', () => {
    async function generate(label: string, config: Record<string, unknown>) {
      const { generateSDKFromDMMF } = await import(
        '../src/pro/features/sdk-publisher/sdk-publisher'
      );
      const dmmf = await getDMMF({ datamodel: SCHEMA });
      const out = join(dir, label);

      await generateSDKFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        out,
        '@prisma/client',
        'postgresql',
        { platforms: ['typescript'], ...config },
        [],
      );

      return out;
    }

    it(
      'emits a package.json using packageName and version',
      async () => {
        const out = await generate('pkg', { packageName: '@acme/billing-sdk', version: '2.1.0' });
        const manifest = JSON.parse(readFileSync(join(out, 'typescript', 'package.json'), 'utf-8'));

        expect(manifest.name).toBe('@acme/billing-sdk');
        expect(manifest.version).toBe('2.1.0');
        expect(manifest.types).toBeDefined();
      },
      GENERATION_TIMEOUT,
    );

    it(
      'points publishConfig at the configured registry',
      async () => {
        const out = await generate('registry', {
          packageName: '@acme/sdk',
          publishRegistry: 'https://npm.internal.acme.dev',
        });
        const manifest = JSON.parse(readFileSync(join(out, 'typescript', 'package.json'), 'utf-8'));

        expect(manifest.publishConfig?.registry).toBe('https://npm.internal.acme.dev');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'writes a README when includeDocumentation is on, and not when it is off',
      async () => {
        const withDocs = await generate('docs-on', { includeDocumentation: true });
        expect(existsSync(join(withDocs, 'typescript', 'README.md'))).toBe(true);

        const withoutDocs = await generate('docs-off', { includeDocumentation: false });
        expect(existsSync(join(withoutDocs, 'typescript', 'README.md'))).toBe(false);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'sends an API key in the configured header',
      async () => {
        const out = await generate('apikey', {
          authConfig: { type: 'apikey', headerName: 'X-Api-Key' },
        });
        const client = readFileSync(join(out, 'typescript', 'index.ts'), 'utf-8');

        expect(client).toContain("'X-Api-Key'");
        expect(client).not.toContain('Bearer');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'uses a custom bearer prefix when asked',
      async () => {
        const out = await generate('bearer', {
          authConfig: { type: 'bearer', tokenPrefix: 'Token' },
        });
        const client = readFileSync(join(out, 'typescript', 'index.ts'), 'utf-8');

        expect(client).toContain('Token ${this.apiKey}');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'defaults to a bearer Authorization header',
      async () => {
        const out = await generate('default-auth', {});
        const client = readFileSync(join(out, 'typescript', 'index.ts'), 'utf-8');

        expect(client).toContain('Authorization');
        expect(client).toContain('Bearer ${this.apiKey}');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'honours authConfig in the Python client too',
      async () => {
        // authConfig was implemented for TypeScript only, so the same option
        // produced different behaviour depending on the platform.
        const out = await generate('py-auth', {
          platforms: ['python'],
          authConfig: { type: 'apikey', headerName: 'X-Api-Key' },
        });
        const client = readFileSync(join(out, 'python', 'api_client.py'), 'utf-8');

        expect(client).toContain("'X-Api-Key'");
        expect(client).not.toContain('Bearer');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'gives the Python client a package manifest',
      async () => {
        // The TypeScript output is installable; Python was a loose module, in a
        // pack called SDK Publisher.
        const out = await generate('py-pkg', {
          platforms: ['python'],
          packageName: 'acme-billing-sdk',
          version: '2.1.0',
        });

        const manifest = readFileSync(join(out, 'python', 'pyproject.toml'), 'utf-8');
        expect(manifest).toContain('acme-billing-sdk');
        expect(manifest).toContain('2.1.0');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'refuses a platform it cannot generate instead of silently skipping it',
      async () => {
        const logged: string[] = [];
        const original = console.log;
        console.log = (...args: unknown[]) => logged.push(args.join(' '));
        try {
          await generate('py-unsupported', { platforms: ['typescript', 'go'] });
        } finally {
          console.log = original;
        }

        expect(logged.join('\n')).toContain('go');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'reports nothing as inert once the options are honoured',
      async () => {
        const logged: string[] = [];
        const original = console.log;
        console.log = (...args: unknown[]) => logged.push(args.join(' '));
        try {
          await generate('quiet', {
            packageName: '@acme/sdk',
            version: '1.0.0',
            publishRegistry: 'https://registry.npmjs.org',
            includeDocumentation: true,
            authConfig: { type: 'bearer' },
          });
        } finally {
          console.log = original;
        }

        expect(logged.join('\n')).not.toMatch(/no effect yet/);
      },
      GENERATION_TIMEOUT,
    );
  });

  /**
   * The API Docs pack emits its own standalone client from the same shared
   * interface helper, so it inherits the same constraints — including that a
   * referenced enum has to be declared in the file.
   */
  describe('the api-docs client', () => {
    let apiDocsSource: string;

    beforeAll(async () => {
      const { generateAPIDocsFromDMMF } = await import('../src/pro/features/api-docs/api-docs');
      const dmmf = await getDMMF({ datamodel: SCHEMA });

      await generateAPIDocsFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        join(dir, 'api-docs'),
        '@prisma/client',
        'postgresql',
        {},
        [],
      );

      apiDocsSource = readFileSync(join(dir, 'api-docs', 'sdk.ts'), 'utf-8');
    }, GENERATION_TIMEOUT);

    it('declares the enums its interfaces reference', () => {
      // `role: Role` with no `enum Role` in the file is TS2304.
      expect(apiDocsSource).toMatch(/role\??:\s*Role\b/);
      expect(apiDocsSource).toMatch(/export enum Role\b/);
    });

    it('gives those enum members string values too', () => {
      expect(apiDocsSource).toMatch(/OWNER\s*=\s*'OWNER'/);
    });
  });
});
