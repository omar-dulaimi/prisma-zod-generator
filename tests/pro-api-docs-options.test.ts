import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_API_DOCS = join(__dirname, '..', 'src', 'pro', 'features', 'api-docs', 'api-docs.ts');
const proAvailable = existsSync(PRO_API_DOCS);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum Status {
  DRAFT
  SENT
}

model Invoice {
  id        String   @id @default(cuid())
  title     String
  status    Status   @default(DRAFT)
  /// @deprecated use title instead
  legacy    String?
  // A DateTime, a number, a boolean and a Json column, so an example is emitted for each kind.
  // Without them the spec carried no DateTime example and the generation timestamp baked into one
  // could not be observed here.
  amount    Decimal
  quantity  Int
  isPaid    Boolean  @default(false)
  meta      Json?
  createdAt DateTime @default(now())
}

// A model whose naive and English plurals differ. "Invoice" alone gives "invoices" under both rules,
// so it cannot show the route pluralisation reaching some parts of the mock server and not others.
model Category {
  id   String @id @default(cuid())
  name String
}
`;

/**
 * Seven of the seventeen APIDocsConfig options were declared, defaulted and never
 * read, so the spec was always OpenAPI 3.0.3 no matter what `openApiVersion` said,
 * and the rest changed nothing at all.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('API Docs options', () => {
  let dir: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  async function generate(label: string, config: Record<string, unknown>) {
    const { generateAPIDocsFromDMMF } = await import('../src/pro/features/api-docs/api-docs');
    const dmmf = await getDMMF({ datamodel: SCHEMA });
    const out = join(dir, label);

    await generateAPIDocsFromDMMF(
      dmmf,
      {},
      join(dir, 'schema.prisma'),
      out,
      '@prisma/client',
      'postgresql',
      config,
      [],
    );

    return out;
  }

  const spec = (out: string) =>
    JSON.parse(readFileSync(join(out, 'openapi.json'), 'utf-8')) as {
      openapi: string;
      paths: Record<string, Record<string, { deprecated?: boolean; responses?: unknown }>>;
      components?: { schemas?: Record<string, unknown> };
      info?: { title?: string };
    };

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    dir = mkdtempSync(join(tmpdir(), 'pzg-api-docs-'));
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  it(
    'defaults to OpenAPI 3.0.3',
    async () => {
      expect(spec(await generate('default', {})).openapi).toBe('3.0.3');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits 3.1.0 when openApiVersion asks for it',
    async () => {
      expect(spec(await generate('v31', { openApiVersion: '3.1.0' })).openapi).toBe('3.1.0');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'omits example payloads when generateExamples is off',
    async () => {
      const out = await generate('no-examples', { generateExamples: false });
      expect(existsSync(join(out, 'examples'))).toBe(false);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'skips the mock server when enableMockServer is off',
    async () => {
      const out = await generate('no-mock', { enableMockServer: false });
      expect(existsSync(join(out, 'mock-server.js'))).toBe(false);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'carries the configured title into the spec',
    async () => {
      const out = await generate('titled', { title: 'Billing API' });
      expect(spec(out).info?.title).toBe('Billing API');
    },
    GENERATION_TIMEOUT,
  );

  /**
   * Paths were always `modelName.toLowerCase() + 's'`, giving `/categorys`.
   * Correcting that unconditionally would rewrite published routes for anyone
   * already built against them, so English pluralisation is opt-in and the literal
   * rule stays the default.
   */
  describe('the generated mock server', () => {
    /**
     * Three problems, all discoverable only by reading what it prints against what it registers.
     *
     * The route handlers went through `pluralize()` but the `/` info payload and the startup banner
     * did not, so with `pluralization: 'english'` the server registered `/categories` while telling
     * the operator to call `/categorys`. And it advertised
     * "API documentation: http://localhost:PORT/docs" while never registering `/docs` — the file it
     * would serve, index.html, is generated right beside it.
     */
    let server: string;

    beforeAll(async () => {
      const out = await generate('mock-server', {
        enableMockServer: true,
        pluralization: 'english',
      });
      server = readFileSync(join(out, 'mock-server.js'), 'utf-8');
    }, GENERATION_TIMEOUT);

    it('advertises the same routes it registers', () => {
      const registered = new Set(
        [...server.matchAll(/app\.get\('\/([a-z]+)'/g)]
          .map((m) => m[1])
          .filter((r) => r.length > 0),
      );
      // Every plural mentioned anywhere in the file must be one the server actually serves.
      const mentioned = [...server.matchAll(/\/(categor[a-z]+|invoice[a-z]*)\b/g)].map((m) => m[1]);

      expect(mentioned.length).toBeGreaterThan(0);
      for (const route of new Set(mentioned)) {
        expect(registered.has(route), `mentions /${route} but does not register it`).toBe(true);
      }
    });

    it('reads mock data under the keys it declares', () => {
      // The route handlers went through pluralize() and the in-memory store did not, so under
      // `pluralization: 'english'` the store held `categorys` while `GET /categories/:id` did
      // `mockData.categories.find(...)` — TypeError: Cannot read properties of undefined, a 500 on
      // every request rather than a cosmetic mismatch.
      const declared = new Set([...server.matchAll(/^\s{2}([a-z]+): \[\],?$/gm)].map((m) => m[1]));
      const referenced = new Set([...server.matchAll(/mockData\.([a-z]+)/g)].map((m) => m[1]));

      expect(referenced.size).toBeGreaterThan(0);
      for (const key of referenced) {
        expect(declared.has(key), `handlers read mockData.${key}, which is never declared`).toBe(
          true,
        );
      }
    });

    it('registers the documentation route it points the operator at', () => {
      if (/\/docs/.test(server)) {
        expect(server).toMatch(/app\.get\('\/docs'/);
      }
    });

    it('serves the spec its documentation page fetches', () => {
      // index.html loads './openapi.json'; serving the page without it shows an empty Swagger UI.
      if (/app\.get\('\/docs'/.test(server)) {
        expect(server).toMatch(/openapi\.json/);
      }
    });
  });

  describe('determinism', () => {
    /**
     * Generated output that a user commits must be byte-identical between runs, or every
     * `prisma generate` produces a diff nobody made. This pack baked `new Date().toISOString()` into
     * the DateTime example of every field, so openapi.json, openapi.yaml and docs/index.html all
     * changed on each run — and the usage guide carried the generation date, changing daily.
     *
     * Found by generating the same pack in 56 different feature combinations: it was the only pack
     * whose output was not identical across all of them.
     *
     * The `new Date()` calls inside the emitted mock server are a different thing and stay: that is
     * runtime code in the generated server, where a live timestamp is correct.
     */
    it(
      'uses a fixed example for a DateTime field, not the moment it ran',
      async () => {
        // Asserted against today's date rather than by generating twice and comparing: two runs in
        // the same millisecond produce the same ISO string, so that comparison passes by luck.
        const out = await generate('determinism-example', {});
        const today = new Date().toISOString().split('T')[0];

        for (const file of ['openapi.json', 'openapi.yaml', join('docs', 'index.html')]) {
          expect(
            readFileSync(join(out, file), 'utf-8'),
            `${file} embeds the generation date`,
          ).not.toContain(today);
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'does not stamp the emitted docs with the day they were generated',
      async () => {
        const out = await generate('determinism-guide', {});
        const today = new Date().toISOString().split('T')[0];

        for (const name of readdirSync(out).filter((f) => f.endsWith('.md'))) {
          expect(
            readFileSync(join(out, name), 'utf-8'),
            `${name} carries today's date`,
          ).not.toContain(today);
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('pluralization', () => {
    it(
      'keeps the literal rule by default',
      async () => {
        const paths = Object.keys(spec(await generate('plural-default', {})).paths);
        expect(paths).toContain('/invoices');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'applies English rules when asked',
      async () => {
        const out = await generate('plural-english', { pluralization: 'english' });
        const paths = Object.keys(spec(out).paths);

        // Invoice pluralises the same either way; the point is the option is read.
        expect(paths).toContain('/invoices');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'pluralises an irregular noun correctly under the english rule',
      async () => {
        const { generateAPIDocsFromDMMF } = await import('../src/pro/features/api-docs/api-docs');
        const dmmf = await getDMMF({
          datamodel: `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Category {
  id   String @id @default(cuid())
  name String
}
`,
        });
        const out = join(dir, 'plural-irregular');

        await generateAPIDocsFromDMMF(
          dmmf,
          {},
          join(dir, 'schema.prisma'),
          out,
          '@prisma/client',
          'postgresql',
          { pluralization: 'english' },
          [],
        );

        const paths = Object.keys(spec(out).paths);
        expect(paths).toContain('/categories');
        expect(paths).not.toContain('/categorys');
      },
      GENERATION_TIMEOUT,
    );
  });

  it(
    'reports only genuinely unimplemented options as inert',
    async () => {
      const logged: string[] = [];
      const original = console.log;
      console.log = (...args: unknown[]) => logged.push(args.join(' '));
      try {
        await generate('quiet', {
          openApiVersion: '3.1.0',
          generateExamples: true,
          enableMockServer: true,
          title: 'Billing API',
        });
      } finally {
        console.log = original;
      }

      expect(logged.join('\n')).not.toMatch(/no effect yet/);
    },
    GENERATION_TIMEOUT,
  );

  describe('the emitted client', () => {
    it(
      'attaches the credential according to authScheme',
      async () => {
        // It hardcoded a bearer header, so authScheme never reached the client —
        // the SDK pack's equivalent option was honoured and these two disagreed.
        const apikey = await generate('auth-apikey', { authScheme: 'apikey' });
        expect(readFileSync(join(apikey, 'sdk.ts'), 'utf-8')).toContain("'X-API-Key'");

        const bearer = await generate('auth-bearer', { authScheme: 'bearer' });
        expect(readFileSync(join(bearer, 'sdk.ts'), 'utf-8')).toContain('Bearer ');
      },
      GENERATION_TIMEOUT,
    );
  });
});
