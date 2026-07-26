import { getDMMF } from '@prisma/internals';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prismaGenerate } from './helpers/prisma-generate';

const REPO_ROOT = join(__dirname, '..');
const FIXTURES = join(__dirname, 'typecheck-fixtures');
const PRO_INDEX = join(REPO_ROOT, 'src', 'pro', 'index.ts');

/**
 * These three packs emit code importing MUI, Chakra, Mantine, react-hook-form, Pact and Next.
 * Those are not root devDependencies — 428 transitive packages for output belonging to paid
 * packs — so they live in tests/typecheck-fixtures and this file skips unless they are
 * installed. `pnpm run test:typecheck-fixtures` installs them and runs it; CI runs it in the one
 * job that has the private submodule.
 *
 * Everything else Pro emits is covered unconditionally by pro-emitted-output-compiles.test.ts.
 * These are the packs where uncompilable output has actually shipped: the Form UX
 * MUI/Chakra/Mantine variants emitted components with no imports at all, the Chakra rewrite was
 * first written against the v2 API that v3 removed, and Server Actions addressed Prisma
 * delegates by lowercasing the model name.
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

/** The same models, with a client generator so a real @prisma/client can be built from them. */
const CLIENT_SCHEMA = SCHEMA.replace(
  `generator client {
  provider = "prisma-client-js"
}`,
  `generator client {
  provider = "prisma-client-js"
  output   = "./client"
}`,
);

describe.skipIf(!proAvailable || !fixturesInstalled)('emitted Pro UI output compiles', () => {
  const outRoot = join(FIXTURES, '.out');
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    rmSync(outRoot, { recursive: true, force: true });
    mkdirSync(outRoot, { recursive: true });

    // Server Actions emits `prisma.member.create({ data })` and imports `Member` and
    // `Prisma.MemberCreateInput`, so it needs a client built from *this* schema. Without that,
    // `@prisma/client` resolves up to the repo's own client — which has SQLServerUser, not
    // Member — and every model type looks missing. Same trap the unconditional check hit.
    writeFileSync(join(outRoot, 'schema.prisma'), CLIENT_SCHEMA);
    await prismaGenerate(join(outRoot, 'schema.prisma'), outRoot);
  }, COMPILE_TIMEOUT);

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
          paths: {
            '@prisma/client': [join(outRoot, 'client', 'index.d.ts')],
            // What a shadcn project's own tsconfig declares. Deliberately no `baseUrl`: with
            // one, a bare `import { z } from 'zod'` resolves to the emitted `zod.ts` sitting in
            // this same directory instead of the real package. Without it, `paths` resolve
            // relative to this tsconfig, which is written into the output directory.
            '@/*': ['./*'],
          },
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

  /**
   * shadcn output imports '@/components/ui/*' — components the consumer scaffolds with the
   * shadcn CLI, which no package provides. These stand in for them.
   *
   * Be clear about what this does and does not prove. Props are typed loosely, so a wrong prop
   * passed to a real shadcn Input would not be caught here. What it does catch is everything
   * else in the file: the react-hook-form wiring, zodResolver, the generated schema types, the
   * component's own props, and any component referenced without an import — which was the
   * original defect in this pack, `<FormField>` emitted with nothing importing it.
   */
  function writeShadcnStubs(dir: string) {
    const ui = join(dir, 'components', 'ui');
    mkdirSync(ui, { recursive: true });

    const passthrough = (names: string[]) =>
      names
        .map(
          (name) =>
            // Returning null is a valid component; no JSX.Element annotation, which is not a
            // global namespace under React 19's types.
            `export const ${name} = (_props: Record<string, unknown>) => null;`,
        )
        .join('\n');

    writeFileSync(join(ui, 'button.tsx'), passthrough(['Button']));
    writeFileSync(join(ui, 'input.tsx'), passthrough(['Input']));
    writeFileSync(join(ui, 'textarea.tsx'), passthrough(['Textarea']));
    writeFileSync(join(ui, 'checkbox.tsx'), passthrough(['Checkbox']));
    writeFileSync(
      join(ui, 'select.tsx'),
      passthrough(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue']),
    );
    writeFileSync(
      join(ui, 'form.tsx'),
      passthrough([
        'Form',
        'FormControl',
        'FormDescription',
        'FormField',
        'FormItem',
        'FormLabel',
        'FormMessage',
      ]),
    );
    writeFileSync(join(ui, 'label.tsx'), passthrough(['Label']));
  }

  for (const uiLibrary of ['barebones', 'shadcn', 'mui', 'chakra', 'mantine']) {
    it(
      `form-ux (${uiLibrary})`,
      async () => {
        const out = await generate(`form-ux-${uiLibrary}`, 'form-ux', 'generateFormUXFromDMMF', {
          uiLibrary,
        });

        expectEmitted(out);
        if (uiLibrary === 'shadcn') writeShadcnStubs(out);
        expect(compile(out)).toBe('');
      },
      COMPILE_TIMEOUT,
    );
  }

  it(
    'server-actions',
    async () => {
      // Emits `'use server'` modules that import `redirect` from 'next/navigation', so this
      // needs Next installed — which is why it belongs here rather than in the unconditional
      // check. It is also the pack the delegate-naming bug lived in: `prisma.projectvariant`
      // instead of `prisma.projectVariant`, which only a real compile catches.
      const out = await generate('server-actions', 'server-actions', 'generateServerActionsFromDMMF', {});

      expectEmitted(out);
      expect(compile(out)).toBe('');
    },
    COMPILE_TIMEOUT,
  );

  it(
    'contract-testing',
    async () => {
      const out = await generate('contract-testing', 'contract-testing', 'generateContractTestsFromDMMF', {});

      expectEmitted(out);
      expect(compile(out)).toBe('');

      // Only one Pact major can be installed here, so compiling proves compatibility with that
      // one. This is what keeps the output portable across the others: `PactV3` has the same
      // shape in 15, 16 and 17, while the root `Pact` export means the V2 server API in 15 and
      // aliases V4 from 16 — so anything using it compiles on exactly one major.
      const test = readFileSync(
        join(out, 'pact', readdirSync(join(out, 'pact')).find((f) => f.endsWith('.test.ts'))!),
        'utf-8',
      );

      expect(test).toMatch(/\bPactV3\b/);
      expect(test).not.toMatch(/import \{[^}]*\bPact\b[^}]*\} from '@pact-foundation\/pact'/);
      // The deep '/src/dsl/' imports the old template used reached into the package's source tree.
      expect(test).not.toContain('@pact-foundation/pact/src/');
    },
    COMPILE_TIMEOUT,
  );
});
