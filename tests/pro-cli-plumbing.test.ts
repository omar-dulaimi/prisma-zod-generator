import { getDMMF } from '@prisma/internals';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_INDEX = join(__dirname, '..', 'src', 'pro', 'index.ts');
const proAvailable = existsSync(PRO_INDEX);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Member {
  id    String @id @default(cuid())
  email String @unique
}

model AuditLog {
  id     String @id @default(cuid())
  action String
}
`;

/**
 * Everything else in this suite calls the pack generators directly, which skips
 * `generateProFeatures()` — the function that reads the generator block, parses the
 * config and decides what each pack receives. That plumbing had no coverage at all,
 * and it is where a half-finished change hides: forwarding `models` to the two packs
 * that parse the schema themselves lives only here, so a test that bypasses the CLI
 * passes whether or not the forwarding exists.
 *
 * The path was previously impossible to exercise: getLicenseStatus() did not honour
 * the local development bypass that detectTampering() and requireFeature() both
 * respect, so `prisma generate` always refused without a real licence key. The audit
 * named that as the likely reason so much Pro output had never been compiled end to
 * end.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Pro CLI plumbing', () => {
  let root: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  async function runGenerator(label: string, config: Record<string, unknown>) {
    const outputPath = join(root, label);
    mkdirSync(outputPath, { recursive: true });

    const configPath = join(root, 'pzg.json');
    writeFileSync(configPath, JSON.stringify(config));

    // The built output, not the source: loadFeatureModules() lazily `require()`s the
    // pro modules, which cannot resolve TypeScript under vitest. lib/ is built once
    // in globalSetup, and this is also what `prisma generate` actually executes.
    const { generateProFeatures } = await import('../lib/cli/pzg-pro-generator.js');
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generateProFeatures({
      dmmf,
      datamodel: SCHEMA,
      schemaPath: join(root, 'schema.prisma'),
      datasources: [{ provider: 'postgresql' }],
      generator: {
        output: { value: outputPath, fromEnvVar: null },
        config: {
          outputPath,
          configPath,
          enableFactories: 'true',
          enablePerformance: 'true',
          enableForms: 'true',
        },
      },
      otherGenerators: [
        {
          provider: { value: 'prisma-client-js', fromEnvVar: null },
          output: { value: join(root, 'client'), fromEnvVar: null },
          previewFeatures: [],
        },
      ],
    } as never);

    return outputPath;
  }

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    root = mkdtempSync(join(tmpdir(), 'pzg-cli-'));
    writeFileSync(join(root, 'schema.prisma'), SCHEMA);
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  it(
    'runs the documented generator path at all',
    async () => {
      // getLicenseStatus() has to honour the same bypass as requireFeature(), or
      // this path cannot be tested without a real licence key.
      const out = await runGenerator('all-models', {});

      expect(existsSync(join(out, 'factories'))).toBe(true);
      expect(existsSync(join(out, 'performance'))).toBe(true);
    },
    GENERATION_TIMEOUT,
  );

  it(
    'forwards model exclusion to the packs that parse the schema themselves',
    async () => {
      // This is the assertion the direct-call tests cannot make: the forwarding
      // lives in the CLI, so bypassing it passes either way.
      const out = await runGenerator('excluded-fn', { models: { AuditLog: { enabled: false } } });

      const factories = readFileSync(join(out, 'factories', 'factories.ts'), 'utf-8');
      expect(factories).toContain('MemberFactory');
      expect(factories).not.toContain('AuditLogFactory');

      const precompiled = readFileSync(join(out, 'performance', 'precompiled.ts'), 'utf-8');
      expect(precompiled).toContain('Member');
      expect(precompiled).not.toContain('AuditLog');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'forwards model exclusion to the packs that take a generator config',
    async () => {
      const out = await runGenerator('excluded-cfg', { models: { AuditLog: { enabled: false } } });
      const form = readFileSync(join(out, 'forms', 'components', 'MemberForm.tsx'), 'utf-8');

      expect(form).toContain('MemberForm');
      expect(existsSync(join(out, 'forms', 'components', 'AuditLogForm.tsx'))).toBe(false);
    },
    GENERATION_TIMEOUT,
  );
});
