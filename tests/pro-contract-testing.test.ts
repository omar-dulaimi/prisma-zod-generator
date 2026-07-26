import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_CONTRACTS = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'contract-testing',
  'contract-testing.ts',
);
const proAvailable = existsSync(PRO_CONTRACTS);

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
  id     String @id @default(cuid())
  title  String
  amount Int
  // The fixture had no enum, so the contract example for one could not be observed here.
  role   Role   @default(MEMBER)
}
`;

/**
 * The generated pacts embedded literal example values, so an interaction only
 * matched if the provider returned exactly those bytes — a contract test that
 * fails on a different id is testing the fixture, not the contract. Pact's
 * matchers exist for this.
 *
 * `includeRequestValidation` and `includeResponseValidation` were also OR'd into a
 * single gate deciding whether any test was written at all, so neither did what
 * its name says.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Contract Testing pacts', () => {
  let dir: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  async function generate(label: string, config: Record<string, unknown>) {
    const { generateContractTestsFromDMMF } = await import(
      '../src/pro/features/contract-testing/contract-testing'
    );
    const dmmf = await getDMMF({ datamodel: SCHEMA });
    const out = join(dir, label);

    await generateContractTestsFromDMMF(
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

  const firstPact = (out: string) => {
    const pactDir = join(out, 'pact');
    const file = readdirSync(pactDir).find((name) => name.endsWith('.test.ts'))!;
    return readFileSync(join(pactDir, file), 'utf-8');
  };

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    dir = mkdtempSync(join(tmpdir(), 'pzg-contracts-'));
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  it(
    'uses a real enum member in the contract example',
    async () => {
      // Pact publishes these examples to the broker as the documented shape of the response. An enum
      // column got `example_role`, a value the API can never return — the matcher passes, because
      // `like` compares types, but anyone reading the pact sees a value that does not exist. Same
      // family as the enum fixes in factories, forms and api-docs.
      const out = await generate('enum-example', {});
      const source = firstPact(out);

      expect(source).not.toMatch(/example_/);
      // The fixture's enum members are the only acceptable values.
      expect(source).toMatch(/'(OWNER|ADMIN|MEMBER)'/);
    },
    GENERATION_TIMEOUT,
  );

  describe('wiremockConfig', () => {
    /**
     * The option gated generation by presence alone — every sub-option was accepted and ignored.
     * `mappingsPath` is the one with something to act on: the files were written to a hardcoded
     * `<output>/wiremock/mappings` regardless. `port`, `host` and `standalone` describe a Wiremock
     * server this pack does not run — it only writes mapping JSON — so they are declared
     * unimplemented rather than silently dropped.
     */
    it(
      'writes mappings where mappingsPath says',
      async () => {
        const out = await generate('wiremock-path', {
          wiremockConfig: { mappingsPath: 'stubs/mappings' },
        });

        expect(existsSync(join(out, 'stubs', 'mappings')), 'mappingsPath should be honoured').toBe(
          true,
        );
        expect(readdirSync(join(out, 'stubs', 'mappings')).length).toBeGreaterThan(0);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'defaults to wiremock/mappings',
      async () => {
        const out = await generate('wiremock-default', { wiremockConfig: {} });

        expect(existsSync(join(out, 'wiremock', 'mappings'))).toBe(true);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'says which sub-options it cannot act on',
      async () => {
        const logged: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => {
          logged.push(args.map(String).join(' '));
        };
        try {
          await generate('wiremock-server-opts', {
            wiremockConfig: { port: 8081, host: 'localhost', standalone: true },
          });
        } finally {
          console.log = origLog;
        }

        const output = logged.join('\n');
        expect(output).toMatch(/port|host|standalone/);
        expect(output.toLowerCase()).toMatch(/no effect|not implemented|ignored/);
      },
      GENERATION_TIMEOUT,
    );
  });

  it(
    'matches response bodies by shape rather than exact value',
    async () => {
      const source = firstPact(await generate('matchers', {}));

      // Matchers arrive under the MatchersV3 namespace, which is how PactV3 exposes them.
      expect(source).toMatch(/import \{[^}]*\bMatchersV3\b/);
      expect(source).toContain('MatchersV3.like(');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'matches a collection with eachLike',
    async () => {
      const source = firstPact(await generate('collections', {}));
      expect(source).toContain('MatchersV3.eachLike(');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'omits the request body when request validation is off',
    async () => {
      const source = firstPact(await generate('no-request', { includeRequestValidation: false }));

      const requestBlocks = source.split('withRequest:').slice(1);
      for (const block of requestBlocks) {
        const upToResponse = block.split('willRespondWith:')[0];
        expect(upToResponse).not.toContain('body:');
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'omits the response body when response validation is off',
    async () => {
      const source = firstPact(await generate('no-response', { includeResponseValidation: false }));

      // PactV3's fluent form: `.willRespondWith({ … })`. Bound each block at its own closing
      // brace, because splitting on a looser delimiter runs past it into the next interaction.
      const responseBlocks = source
        .split('.willRespondWith({')
        .slice(1)
        .map((block) => block.split('\n      })')[0]);

      expect(responseBlocks.length).toBeGreaterThan(0);
      for (const block of responseBlocks) {
        expect(block).not.toContain('body:');
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'still writes interaction tests when both validation flags are off',
    async () => {
      // Status codes and paths are worth pinning even without body assertions.
      const out = await generate('no-bodies', {
        includeRequestValidation: false,
        includeResponseValidation: false,
      });

      expect(existsSync(join(out, 'pact'))).toBe(true);
      expect(firstPact(out)).toContain('status:');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'writes pacts where the provider verification looks for them',
    async () => {
      // The consumer wrote `dir: './pacts'`, resolved against the process CWD,
      // while the verifier looked in `<output>/pacts` relative to its own file. The
      // two only agreed if the tests happened to run from the right directory, so
      // verification found no pacts.
      const out = await generate('pact-dir', {});
      const consumer = firstPact(out);
      const provider = readFileSync(
        join(out, 'provider', readdirSync(join(out, 'provider'))[0]),
        'utf-8',
      );

      // Both sides must anchor on their own location, not the CWD.
      expect(consumer).toContain("path.resolve(__dirname, '..', 'pacts')");
      expect(consumer).not.toContain("dir: './pacts'");
      expect(provider).toContain("path.resolve(__dirname, '..', 'pacts')");
    },
    GENERATION_TIMEOUT,
  );

  it(
    'generates a provider verification test',
    async () => {
      // The pack promised both sides; only the consumer side existed.
      const out = await generate('provider', {});
      const providerDir = join(out, 'provider');

      expect(existsSync(providerDir)).toBe(true);
      const source = readFileSync(join(providerDir, readdirSync(providerDir)[0]), 'utf-8');
      expect(source).toContain('Verifier');
    },
    GENERATION_TIMEOUT,
  );
});
