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

// Models whose naive and English plurals differ. "Invoice" alone cannot show a pluralisation
// difference — both rules give "invoices" — which is why the SDK diverging from the OpenAPI spec
// went unnoticed here.
model Category {
  id   String @id @default(cuid())
  name String
}

model Status {
  id    String @id @default(cuid())
  label String
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
    expect(source).toContain('async listInvoices(');
  });

  /**
   * Six of the eight SDKConfig options were declared, defaulted and never read —
   * including the whole authConfig union behind the pack's "Bearer, API Key,
   * OAuth2" claim, and packageName/version, which is what makes something a
   * publishable package rather than a loose file.
   */
  describe('the Python client', () => {
    /**
     * Its methods were emitted inside the TypedDict, not inside APIClient. Python has no braces, so
     * indented `def`s attach to whichever class precedes them — and the template put the TypedDicts
     * after the class. The result: `APIClient` had `__init__` and `_request` and nothing else, so
     * `client.list_invoices()` raised AttributeError, and mypy reported five
     * "Invalid statement in TypedDict definition".
     *
     * Verified with mypy 2.3 in a python:3.12-slim container, which is the check the audit could not
     * run for want of an installed mypy.
     */
    let client: string;

    beforeAll(async () => {
      const { generateSDKFromDMMF } = await import(
        '../src/pro/features/sdk-publisher/sdk-publisher'
      );
      const dmmf = await getDMMF({ datamodel: SCHEMA });
      const out = join(dir, 'python-shape');
      await generateSDKFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        out,
        '@prisma/client',
        'postgresql',
        { platforms: ['python'] },
        [],
      );
      client = readFileSync(join(out, 'python', 'api_client.py'), 'utf-8');
    }, GENERATION_TIMEOUT);

    it('defines the TypedDicts before the client that returns them', () => {
      expect(client.indexOf('class Invoice(TypedDict):')).toBeLessThan(
        client.indexOf('class APIClient:'),
      );
    });

    it('puts the methods on APIClient, not on a TypedDict', () => {
      const clientBody = client.slice(client.indexOf('class APIClient:'));
      expect(clientBody).toContain('def list_invoices');
      expect(clientBody).toContain('def create_invoice');

      // Nothing may follow a TypedDict's fields except more fields.
      const typedDict = client.slice(
        client.indexOf('class Invoice(TypedDict):'),
        client.indexOf('class APIClient:'),
      );
      expect(typedDict).not.toContain('def ');
      expect(typedDict).not.toContain('self._request');
    });

    it('returns the model type rather than a bare dict', () => {
      expect(client).toMatch(/def list_invoices\(self\)[^\n]*-> List\[Invoice\]/);
      expect(client).toMatch(/def get_invoice\([^)]*\)[^\n]*-> Invoice/);
    });
  });

  describe('the TypeScript client’s typing', () => {
    /**
     * Measured against the client API Docs emits from the same schema, this one was the weaker of the
     * two — which is backwards, since publishing SDKs is this pack's entire job and it sits in a
     * higher tier. API Docs returned `Promise<Account[]>` and took `Partial<Account>`; this returned
     * an inferred `any` from `request()` and took `data: any`, so nothing a caller wrote against it
     * was checked. It also had no pagination and a thinner error message.
     *
     * The fix is parity, not consolidation: the two packs differ in ways that are deliberate — this
     * one emits Python, package metadata and the authConfig variants — so sharing the emitter would be
     * a large refactor across two paid packs for no user-visible gain. What must not diverge is
     * already shared: the route pluralizer, after the two disagreed on /categories versus /categorys.
     */
    let client: string;

    beforeAll(async () => {
      const { generateSDKFromDMMF } = await import(
        '../src/pro/features/sdk-publisher/sdk-publisher'
      );
      const dmmf = await getDMMF({ datamodel: SCHEMA });
      const out = join(dir, 'typing');
      await generateSDKFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        out,
        '@prisma/client',
        'postgresql',
        { platforms: ['typescript'] },
        [],
      );
      client = readFileSync(join(out, 'typescript', 'index.ts'), 'utf-8');
    }, GENERATION_TIMEOUT);

    /** Collapsed, because Prettier decides where the emitted signatures wrap. */
    const flat = () => client.replace(/\s+/g, ' ');

    it('declares what each method returns', () => {
      expect(flat()).toMatch(/async listInvoices\([^)]*\): Promise<Invoice\[\]>/);
      expect(flat()).toMatch(/async getInvoice\([^)]*\): Promise<Invoice>/);
      expect(flat()).toMatch(/async deleteInvoice\([^)]*\): Promise<void>/);
    });

    it('types the request body instead of taking any', () => {
      expect(flat()).toMatch(
        /createInvoice\( data: Partial<Invoice>|createInvoice\(data: Partial<Invoice>/,
      );
      expect(flat()).toMatch(/updateInvoice\([^)]*data: Partial<Invoice>/);
      expect(client).not.toMatch(/data: any/);
    });

    it('supports pagination on a list call', () => {
      // Prettier adds a trailing separator when it breaks the object type across lines.
      expect(flat()).toMatch(/listInvoices\(\s*params\?: \{ skip\?: number; take\?: number;? \}/);
      expect(client).toMatch(/URLSearchParams/);
    });

    it('includes the status text in an error', () => {
      expect(client).toMatch(/statusText/);
    });
  });

  describe('route pluralisation', () => {
    /**
     * API Docs and SDK Publisher derive the same URL paths from the same models, and only one of them
     * knew about `pluralization`. With `pluralization: 'english'` the spec documented `/categories`
     * while this pack's client called `/categorys` — so the generated SDK 404s against the mock server
     * the same run produced. The SDK rejected the option outright as unknown.
     *
     * Found by generating both packs from one schema with irregular plurals and diffing their paths.
     */
    async function paths(config: Record<string, unknown>) {
      const { generateSDKFromDMMF } = await import(
        '../src/pro/features/sdk-publisher/sdk-publisher'
      );
      const dmmf = await getDMMF({ datamodel: SCHEMA });
      const out = join(dir, `plural-${JSON.stringify(config).replace(/\W/g, '')}`);

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

      const source = readFileSync(join(out, 'typescript', 'index.ts'), 'utf-8');
      return [...source.matchAll(/'\/([a-z]+)'/g)].map((m) => m[1]);
    }

    it(
      'appends a bare s by default, matching every previously generated client',
      async () => {
        const found = await paths({});

        expect(found).toContain('categorys');
        expect(found).toContain('statuss');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'applies English rules when asked, like the OpenAPI spec does',
      async () => {
        const found = await paths({ pluralization: 'english' });

        expect(found).toContain('categories');
        expect(found).toContain('statuses');
        expect(found).not.toContain('categorys');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'agrees with the paths API Docs documents',
      async () => {
        // The two packs are routinely enabled together; disagreeing on a path makes the SDK
        // unusable against the spec's own mock server.
        const { generateAPIDocsFromDMMF } = await import('../src/pro/features/api-docs/api-docs');
        const dmmf = await getDMMF({ datamodel: SCHEMA });
        const docsOut = join(dir, 'plural-docs');

        await generateAPIDocsFromDMMF(
          dmmf,
          {},
          join(dir, 'schema.prisma'),
          docsOut,
          '@prisma/client',
          'postgresql',
          { pluralization: 'english' },
          [],
        );

        const spec = JSON.parse(readFileSync(join(docsOut, 'openapi.json'), 'utf-8')) as {
          paths: Record<string, unknown>;
        };
        const documented = Object.keys(spec.paths)
          .filter((route) => !route.includes('{'))
          .map((route) => route.replace('/', ''));

        for (const route of await paths({ pluralization: 'english' })) {
          expect(documented, `the SDK calls /${route}, which the spec does not document`).toContain(
            route,
          );
        }
      },
      GENERATION_TIMEOUT,
    );
  });

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
