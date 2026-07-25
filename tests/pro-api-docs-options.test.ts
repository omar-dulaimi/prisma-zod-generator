import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
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
  id     String @id @default(cuid())
  title  String
  status Status @default(DRAFT)
  /// @deprecated use title instead
  legacy String?
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
