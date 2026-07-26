import { getDMMF } from '@prisma/internals';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_API_DOCS = join(__dirname, '..', 'src', 'pro', 'features', 'api-docs', 'api-docs.ts');
const proAvailable = existsSync(PRO_API_DOCS);

/**
 * The api-docs pack emits an OpenAPI spec, a TypeScript SDK, a mock server and request
 * examples — all describing the same endpoints. Four places built the URL paths, and only two
 * of them honoured `pluralization`: the spec and the examples went through `pluralize()`, while
 * the SDK and the mock server always appended a bare "s".
 *
 * Under the default (`pluralization: 'literal'`) everything agrees, which is why this went
 * unnoticed. Set the documented `pluralization: 'english'` and the spec a customer integrates
 * against says `/categories` while the SDK the same pack hands them calls `/categorys`.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('api-docs path consistency', () => {
  const dir = join(process.cwd(), `test-env-api-docs-paths-${process.pid}`);
  const savedDevMode = process.env.PZG_DEV_MODE;

  // Plurals that a bare "s" gets wrong: -y after a consonant, and a sibilant ending.
  const SCHEMA = `
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

model Box {
  id    String @id @default(cuid())
  label String
}

model Day {
  id   String @id @default(cuid())
  note String
}
`;

  const outputs: Record<string, string> = {};

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    mkdirSync(dir, { recursive: true });

    const { generateAPIDocsFromDMMF } = await import('../src/pro/features/api-docs/api-docs');
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    for (const [label, config] of [
      ['literal', {}],
      ['english', { pluralization: 'english' }],
    ] as Array<[string, Record<string, unknown>]>) {
      const target = join(dir, label);
      await generateAPIDocsFromDMMF(
        dmmf,
        {},
        join(dir, 'schema.prisma'),
        target,
        '@prisma/client',
        'postgresql',
        config,
        [],
      );
      outputs[label] = target;
    }
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  /** Collection paths declared by the OpenAPI spec, e.g. '/categories'. */
  function specPaths(label: string): string[] {
    const spec = JSON.parse(readFileSync(join(outputs[label], 'openapi.json'), 'utf-8'));
    return Object.keys(spec.paths)
      .filter((path) => !path.includes('{'))
      .sort();
  }

  it('appends a bare s by default, as documented', () => {
    expect(specPaths('literal')).toEqual(['/boxs', '/categorys', '/days']);
  });

  it('uses English plurals in the spec when asked', () => {
    expect(specPaths('english')).toEqual(['/boxes', '/categories', '/days']);
  });

  for (const label of ['literal', 'english']) {
    it(`calls the spec's own paths from the emitted SDK (${label})`, () => {
      const sdk = readFileSync(join(outputs[label], 'sdk.ts'), 'utf-8');

      for (const path of specPaths(label)) {
        expect(sdk, `SDK should call ${path}`).toContain(`'${path}'`);
      }
    });

    it(`serves the spec's own paths from the emitted mock server (${label})`, () => {
      const mockServer = join(outputs[label], 'mock-server.js');
      if (!existsSync(mockServer)) return;

      const source = readFileSync(mockServer, 'utf-8');
      for (const path of specPaths(label)) {
        expect(source, `mock server should serve ${path}`).toContain(path);
      }
    });
  }

  it('keeps a plural that is already plain plain', () => {
    // `Day` ends in a vowel + y, so even under English rules it stays `/days`, not `/daies`.
    expect(specPaths('english')).toContain('/days');
    expect(readFileSync(join(outputs.english, 'sdk.ts'), 'utf-8')).not.toContain('/daies');
  });
});
