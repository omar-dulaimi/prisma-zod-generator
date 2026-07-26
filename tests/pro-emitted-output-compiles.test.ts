import { getDMMF } from '@prisma/internals';
import { execFileSync, spawnSync } from 'child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prismaGenerate } from './helpers/prisma-generate';

const REPO_ROOT = join(__dirname, '..');
const PRO_INDEX = join(REPO_ROOT, 'src', 'pro', 'index.ts');
const proAvailable = existsSync(PRO_INDEX);

/** Generating a client plus five cold tsc runs. */
const COMPILE_TIMEOUT = 240_000;

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

/// @policy read:where tenantId == ctx.tenantId
/// @policy deny:role in ["MEMBER"]
model Member {
  id        String    @id @default(cuid())
  /// @pii email redact:logs
  email     String    @unique
  name      String?
  role      Role      @default(MEMBER)
  tenantId  String
  budget    Decimal
  meta      Json?
  document  Bytes?
  dueAt     DateTime?
  createdAt DateTime  @default(now())
}

model ProjectVariant {
  id       String @id @default(cuid())
  label    String
  tenantId String
}
`;

/**
 * Every "0 type errors" in this project's history was a manual, one-off check:
 * generate a pack, copy it somewhere, run tsc by hand. Nothing stopped a
 * regression the next day — and emitted code that does not compile is the single
 * most common defect these packs have had. Six separate ones shipped that way.
 *
 * This makes the check standing rather than anecdotal. It covers every pack whose emitted code
 * compiles against what this repo already installs — Prisma client and zod, or in the case of
 * the two SDKs nothing at all, since both are fetch-based.
 *
 * Form UX, Server Actions and Contract Testing are checked separately by
 * pro-ui-output-compiles.test.ts, because their output imports MUI, Chakra, Mantine, Pact and
 * Next; see tests/typecheck-fixtures/README.md. Drift Guard is absent from both because it
 * writes no files — it compares two DMMFs and returns changes plus a Markdown string, which
 * pro-drift-guard-report.test.ts covers. Between the two files, ten of the eleven packs have
 * their emitted output compiled.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('emitted Pro output compiles', () => {
  let root: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    root = mkdtempSync(join(tmpdir(), 'pzg-compile-'));
    writeFileSync(join(root, 'schema.prisma'), SCHEMA);

    // `prisma-client-js` resolves `@prisma/client` relative to its own output
    // directory, and tsc needs @types/node for the packs that emit server-side
    // code. Symlinking rather than generating inside the repo keeps this test from
    // writing into shared state — a race that has broken this suite three times.
    symlinkSync(join(REPO_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');

    // A client generated from *this* schema. Pointing the emitted imports at the
    // repo's own client is what made the first run of this test fail: it has
    // SQLServerUser, not Member, so every model type looked missing.
    await prismaGenerate(join(root, 'schema.prisma'), root);
  }, COMPILE_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  /**
   * Compile a directory of emitted files under strict mode, resolving
   * `@prisma/client` to the client generated from this schema — what a consumer
   * project has.
   */
  function compile(dir: string, extraOptions: Record<string, unknown> = {}): string {
    const tsconfig = join(dir, 'tsconfig.compile.json');
    writeFileSync(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          target: 'es2022',
          module: 'preserve',
          moduleResolution: 'bundler',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          esModuleInterop: true,
          jsx: 'react-jsx',
          types: ['node'],
          typeRoots: [join(REPO_ROOT, 'node_modules', '@types')],
          paths: {
            '@prisma/client': [join(root, 'client', 'index.d.ts')],
            zod: [join(REPO_ROOT, 'node_modules', 'zod')],
          },
          ...extraOptions,
        },
        include: ['**/*.ts'],
      }),
    );

    try {
      execFileSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsc'), ['-p', tsconfig], {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return '';
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string };
      return `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }
  }

  async function generate(pack: string, exportName: string, config: unknown = {}) {
    const out = join(root, pack);
    mkdirSync(out, { recursive: true });

    const mod = (await import(`../src/pro/features/${pack}/${pack}`)) as Record<string, unknown>;
    const run = mod[exportName] as (...args: unknown[]) => Promise<void>;
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await run(
      dmmf,
      {},
      join(root, 'schema.prisma'),
      out,
      '@prisma/client',
      'postgresql',
      config,
      [],
    );

    return out;
  }

  it(
    'policies',
    async () => {
      const out = await generate('policies', 'generatePoliciesFromDMMF');
      // verbatimModuleSyntax is the strictest realistic consumer setting, and the
      // one that caught this pack's value-imported types.
      expect(compile(out, { verbatimModuleSyntax: true })).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'multi-tenant-kit',
    async () => {
      const out = await generate('multi-tenant-kit', 'generateMultiTenantKitFromDMMF');
      expect(compile(out)).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'postgres-rls',
    async () => {
      const out = join(root, 'postgres-rls');
      mkdirSync(out, { recursive: true });
      await generate('postgres-rls', 'generatePostgresRLSFromDMMF', { outputPath: out });
      expect(compile(out)).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'data-factories',
    async () => {
      const { generateDataFactories } = await import(
        '../src/pro/features/data-factories/data-factories'
      );
      const out = join(root, 'factories');
      await generateDataFactories(join(root, 'schema.prisma'), { outputPath: out });
      expect(compile(out)).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'sdk-publisher (TypeScript target)',
    async () => {
      // The emitted TypeScript SDK is fetch-based and imports nothing but its own package,
      // so unlike the Form UX and Contract Testing output it can be compiled here without
      // pulling MUI, Chakra, Mantine or Pact into this repo's devDependencies.
      const out = await generate('sdk-publisher', 'generateSDKFromDMMF', {
        platforms: ['typescript'],
        packageName: '@acme/api-sdk',
      });

      // Compiling an empty directory passes, so prove there was something to compile.
      const emitted = readdirSync(join(out, 'typescript'), { recursive: true }) as string[];
      expect(emitted.filter((f) => f.endsWith('.ts')).length).toBeGreaterThan(0);

      expect(compile(join(out, 'typescript'))).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'sdk-publisher (Python target)',
    async () => {
      // The Python client was only ever checked by hand with py_compile. Doing it here needs no
      // dependency beyond the interpreter, which CI's ubuntu-latest image has.
      const out = await generate('sdk-publisher', 'generateSDKFromDMMF', {
        platforms: ['python'],
        packageName: 'acme-api-sdk',
      });

      const client = join(out, 'python', 'api_client.py');
      expect(existsSync(client), 'expected python/api_client.py').toBe(true);

      // Byte-compiling proves it parses. It does not prove the API is right, and no type
      // checker runs over it — mypy would be the next step if this pack's Python grows.
      const result = spawnSync('python3', ['-m', 'py_compile', client], { encoding: 'utf-8' });
      expect(`${result.stderr ?? ''}`.trim()).toBe('');
      expect(result.status).toBe(0);
    },
    COMPILE_TIMEOUT,
  );

  it(
    'api-docs (emitted SDK)',
    async () => {
      // The pack emits openapi.json/yaml, an HTML viewer, a JS mock server, examples and
      // sdk.ts. Only the SDK is TypeScript, and it is self-contained — interfaces plus a
      // fetch-based client — so it compiles here with no extra dependencies.
      const out = await generate('api-docs', 'generateAPIDocsFromDMMF');

      const sdkOnly = join(root, 'api-docs-sdk');
      mkdirSync(sdkOnly, { recursive: true });
      copyFileSync(join(out, 'sdk.ts'), join(sdkOnly, 'sdk.ts'));

      expect(compile(sdkOnly)).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'performance-pack',
    async () => {
      const { generatePerformancePack } = await import(
        '../src/pro/features/performance-pack/performance-pack'
      );
      const out = join(root, 'performance');
      await generatePerformancePack(join(root, 'schema.prisma'), { outputPath: out });
      expect(compile(out)).toBe('');
    },
    COMPILE_TIMEOUT,
  );
});
