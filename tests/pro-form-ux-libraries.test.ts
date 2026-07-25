import { getDMMF } from '@prisma/internals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_FORM_UX = join(__dirname, '..', 'src', 'pro', 'features', 'form-ux', 'form-ux.ts');
const proAvailable = existsSync(PRO_FORM_UX);

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

/**
 * `uiLibrary` accepts five values but only `barebones` and `shadcn` are
 * implemented. The other three fell through to the shadcn branch, emitting
 * `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>` and
 * `<FormMessage>` with no imports for any of them and no library code at all —
 * output that cannot compile. Producing forms that work, and saying so, beats
 * silently emitting a file the customer has to debug.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Form UX ui library selection', () => {
  let root: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  async function generate(dirName: string, config: Record<string, unknown>) {
    const outputPath = join(root, dirName);

    const { generateFormUXFromDMMF } = await import('../src/pro/features/form-ux/form-ux');
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    await generateFormUXFromDMMF(
      dmmf,
      {},
      join(root, 'schema.prisma'),
      outputPath,
      '@prisma/client',
      'postgresql',
      config,
      [],
    );

    return outputPath;
  }

  beforeAll(() => {
    process.env.PZG_DEV_MODE = 'true';
    root = mkdtempSync(join(tmpdir(), 'pzg-form-ux-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(root, { recursive: true, force: true });
  });

  // Distinctive to shadcn's form wrappers. `FormControl` is deliberately excluded:
  // MUI and Chakra both export a component of that name, so its presence is
  // legitimate there rather than a leak.
  const shadcnOnlyComponents = ['<FormField', '<FormItem', '<FormMessage'];

  describe('an unrecognised uiLibrary', () => {
    it(
      'falls back to barebones and says so',
      async () => {
        const logged: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...args) => {
          logged.push(args.join(' '));
        });

        const out = await generate('lib-bogus', { uiLibrary: 'bootstrap' });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        expect(logged.join('\n')).toContain('bootstrap');
        expect(source).toContain('<input');
        expect(source).not.toContain('@/components/ui/');
      },
      GENERATION_TIMEOUT,
    );
  });

  describe.each([
    {
      library: 'mui',
      pkg: '@mui/material',
      expected: ['TextField', 'Checkbox', 'Select', 'MenuItem', 'Button'],
    },
    {
      library: 'chakra',
      // Chakra v3: the v2 FormControl/FormLabel/FormErrorMessage trio was replaced
      // by the Field namespace, and Select became compound (NativeSelect).
      pkg: '@chakra-ui/react',
      expected: ['Input', 'Checkbox', 'NativeSelect', 'Button', 'Field.Root'],
    },
    {
      library: 'mantine',
      pkg: '@mantine/core',
      expected: ['TextInput', 'Checkbox', 'Select', 'Button', 'Textarea'],
    },
  ])('uiLibrary: $library, implemented', ({ library, pkg, expected }) => {
    it(
      'imports from the library it was asked for',
      async () => {
        const out = await generate(`impl-${library}`, { uiLibrary: library });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        expect(source).toContain(`from '${pkg}'`);
      },
      GENERATION_TIMEOUT,
    );

    it(
      'renders that library’s components',
      async () => {
        const out = await generate(`impl-render-${library}`, { uiLibrary: library });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        for (const component of expected) {
          expect(source, `${library} should use ${component}`).toContain(`<${component}`);
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'uses Controller, since these inputs are controlled',
      async () => {
        const out = await generate(`impl-ctrl-${library}`, { uiLibrary: library });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        expect(source).toContain("import { Controller, useForm } from 'react-hook-form'");
        expect(source).toContain('<Controller');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'references nothing it has not imported',
      async () => {
        const out = await generate(`impl-clean-${library}`, { uiLibrary: library });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        // shadcn's wrappers were the original leak: emitted without any import.
        for (const component of shadcnOnlyComponents) {
          expect(source, `${component} leaked into ${library} output`).not.toContain(component);
        }
        expect(source).not.toContain('@/components/ui/');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'maps an enum column onto a select with its members',
      async () => {
        const out = await generate(`impl-enum-${library}`, { uiLibrary: library });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        expect(source).toContain('OWNER');
        expect(source).toContain('MEMBER');
      },
      GENERATION_TIMEOUT,
    );

    it(
      'no longer warns, because the library is implemented',
      async () => {
        const logged: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...args) => {
          logged.push(args.join(' '));
        });

        await generate(`impl-quiet-${library}`, { uiLibrary: library });

        expect(logged.join('\n')).not.toMatch(/not implemented/i);
      },
      GENERATION_TIMEOUT,
    );
  });

  it(
    'still emits shadcn components when shadcn is requested',
    async () => {
      const out = await generate('lib-shadcn', { uiLibrary: 'shadcn' });
      const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

      expect(source).toContain("from '@/components/ui/input'");
      expect(source).toContain('<Input');
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits plain elements for barebones',
    async () => {
      const out = await generate('lib-barebones', { uiLibrary: 'barebones' });
      const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

      expect(source).not.toContain('@/components/ui/');
      expect(source).toContain('<input');
    },
    GENERATION_TIMEOUT,
  );
});
