import { getDMMF } from '@prisma/internals';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..');
const FIXTURES = join(__dirname, 'typecheck-fixtures');
const PRO_INDEX = join(REPO_ROOT, 'src', 'pro', 'index.ts');

/**
 * These two packs emit code importing MUI, Chakra, Mantine, react-hook-form and Pact. Those
 * are not root devDependencies — 322 transitive packages for output belonging to paid packs —
 * so they live in tests/typecheck-fixtures and this file skips unless they are installed.
 * `pnpm run test:typecheck-fixtures` installs them and runs it.
 *
 * Everything else Pro emits is covered unconditionally by pro-emitted-output-compiles.test.ts.
 * These were the packs left over, and they are the ones where uncompilable output has actually
 * shipped: the Form UX MUI/Chakra/Mantine variants were emitting components with no imports at
 * all, and the Chakra rewrite was first written against the v2 API that v3 removed.
 */
const fixturesInstalled = existsSync(join(FIXTURES, 'node_modules'));
const proAvailable = existsSync(PRO_INDEX);

const COMPILE_TIMEOUT = 300_000;

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  MEMBER
}

model Member {
  id       String  @id @default(cuid())
  email    String  @unique
  name     String?
  role     Role    @default(MEMBER)
  isActive Boolean @default(true)
  bio      String?
  meta     Json?
}
`;

describe.skipIf(!proAvailable || !fixturesInstalled)('emitted Pro UI output compiles', () => {
  const outRoot = join(FIXTURES, '.out');
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    rmSync(outRoot, { recursive: true, force: true });
    mkdirSync(outRoot, { recursive: true });
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(outRoot, { recursive: true, force: true });
  });

  /**
   * Compile a directory under the fixtures package, so the libraries resolve by the ordinary
   * upward node_modules lookup — the same way they would in a consumer's project.
   */
  function compile(dir: string): string {
    const tsconfig = join(dir, 'tsconfig.json');
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
          types: ['node', 'react', 'jest'],
        },
        include: ['**/*.ts', '**/*.tsx'],
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
      const output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
      const lines = output.split('\n').filter((line) => line.includes('error TS'));
      return `${lines.length} type error(s):\n${lines.slice(0, 10).join('\n')}`;
    }
  }

  async function generate(label: string, pack: string, exportName: string, config: object) {
    const out = join(outRoot, label);
    mkdirSync(out, { recursive: true });

    const mod = (await import(`../src/pro/features/${pack}/${pack}`)) as Record<string, unknown>;
    const run = mod[exportName] as (...args: unknown[]) => Promise<void>;
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await run(dmmf, {}, join(outRoot, 'schema.prisma'), out, '@prisma/client', 'postgresql', config, []);
    return out;
  }

  /** Guards against a pack emitting nothing and the compile trivially succeeding. */
  function expectEmitted(dir: string) {
    const files = readdirSync(dir, { recursive: true }) as string[];
    expect(files.filter((f) => /\.tsx?$/.test(f)).length).toBeGreaterThan(0);
  }

  // shadcn is absent deliberately: its components import '@/components/ui/*', which the
  // consumer scaffolds with the shadcn CLI, so there is nothing here to resolve them to.
  for (const uiLibrary of ['barebones', 'mui', 'chakra', 'mantine']) {
    it(
      `form-ux (${uiLibrary})`,
      async () => {
        const out = await generate(`form-ux-${uiLibrary}`, 'form-ux', 'generateFormUXFromDMMF', {
          uiLibrary,
        });

        expectEmitted(out);
        expect(compile(out)).toBe('');
      },
      COMPILE_TIMEOUT,
    );
  }

  it(
    'contract-testing',
    async () => {
      const out = await generate('contract-testing', 'contract-testing', 'generateContractTestsFromDMMF', {});

      expectEmitted(out);
      expect(compile(out)).toBe('');
    },
    COMPILE_TIMEOUT,
  );
});
