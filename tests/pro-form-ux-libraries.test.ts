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

  describe('generateTests: true', () => {
    /**
     * The emitted tests could never run. They are written to `__tests__/<Model>Form.test.tsx` while
     * the component sits in `components/`, and they imported `'./<Model>Form'` — a sibling that does
     * not exist. They also call `toBeInTheDocument()` without importing `@testing-library/jest-dom`,
     * which registers that matcher. For an option whose entire job is emitting runnable tests, both
     * are fatal. Found by generating every documented value of every option and type-checking.
     */
    let source: string;
    let out: string;

    beforeAll(async () => {
      out = await generate('with-tests', { generateTests: true });
      source = readFileSync(join(out, '__tests__', 'MemberForm.test.tsx'), 'utf-8');
    }, GENERATION_TIMEOUT);

    it('imports the component by a path that exists', () => {
      const specifier = source.match(/from '(\.[^']*MemberForm)'/)?.[1];
      expect(specifier, 'the test should import the component').toBeTruthy();
      expect(existsSync(join(out, '__tests__', `${specifier}.tsx`))).toBe(true);
    });

    it('registers the jest-dom matchers it uses', () => {
      // Without this import `toBeInTheDocument` is not a function at runtime and not a type at
      // compile time.
      if (source.includes('toBeInTheDocument')) {
        expect(source).toMatch(/@testing-library\/jest-dom/);
      }
    });
  });

  describe('the per-field validation helpers', () => {
    /**
     * `<Model>FormValidation` exposes a `validate<Field>` per column, which a form calls to check
     * one input as the user types. Each was implemented as
     * `Schema.safeParse({ <field>: value })` against the *whole model* schema — so every other
     * required column was missing and the parse always failed. Measured on the emitted output:
     * `validateEmail('a@b.c')` and `validateEmail(12345)` both returned false, making the helpers
     * not merely useless but indistinguishable between valid and invalid input. A form wired to them
     * rejects everything the user types.
     */
    let helpers: Record<string, (value: unknown) => boolean>;

    beforeAll(async () => {
      const out = await generate('field-validation', { uiLibrary: 'barebones' });
      const mod = await import(join(out, 'validation', 'MemberValidation.ts'));
      helpers = mod.MemberFormValidation;
    }, GENERATION_TIMEOUT);

    it('accepts a valid value for a required string', () => {
      expect(helpers.validateEmail('someone@example.com')).toBe(true);
    });

    it('rejects a value of the wrong type', () => {
      expect(helpers.validateEmail(12345)).toBe(false);
    });

    it('accepts a valid value for an optional column', () => {
      expect(helpers.validateName('Alice')).toBe(true);
      // Optional means absent is fine too.
      expect(helpers.validateName(undefined)).toBe(true);
    });

    it('validates an enum against its members', () => {
      expect(helpers.validateRole('MEMBER')).toBe(true);
      expect(helpers.validateRole('EMPEROR')).toBe(false);
    });

    it('validates a boolean column', () => {
      expect(helpers.validateIsActive(true)).toBe(true);
      expect(helpers.validateIsActive('yes')).toBe(false);
    });

    it('accepts at least one plausible value for every field it emits', () => {
      // The original failure was uniform: every helper returned false for everything. Probing with a
      // single value cannot show that, because a boolean column legitimately rejects a string — so
      // each helper is offered a spread of candidates and must accept one of them.
      const candidates: unknown[] = ['MEMBER', 'someone@example.com', 42, true, undefined, {}];
      const alwaysFalse = Object.keys(helpers)
        .filter((key) => key.startsWith('validate'))
        .filter((key) => !candidates.some((candidate) => helpers[key](candidate)));
      expect(alwaysFalse).toEqual([]);
    });
  });

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

  /**
   * `enableI18n` had no coverage. The keys file nested every entry under a
   * lowercased model segment (`forms.member.email.label`) while every emitted
   * component looks up `t('forms.email.label')` — so no translation the pack
   * generated could ever resolve, and each label rendered as its raw key.
   */
  describe('i18n keys', () => {
    it(
      'emits keys at the paths the components look up',
      async () => {
        const out = await generate('i18n-default', { enableI18n: true });
        const component = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');
        const keys = JSON.parse(readFileSync(join(out, 'i18n', 'member.json'), 'utf-8'));

        // Read the paths out of the component rather than hardcoding them, so the
        // two can never drift again.
        const looked = [...component.matchAll(/t\('([^']+)'\)/g)].map((m) => m[1]);
        expect(looked.length).toBeGreaterThan(0);

        for (const path of looked) {
          const value = path.split('.').reduce<unknown>((node, segment) => {
            return node && typeof node === 'object'
              ? (node as Record<string, unknown>)[segment]
              : undefined;
          }, keys);
          expect(value, `no translation for ${path}`).toBeTypeOf('string');
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'honours a custom namespace',
      async () => {
        const out = await generate('i18n-ns', { enableI18n: true, i18nNamespace: 'admin' });
        const component = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');
        const keys = JSON.parse(readFileSync(join(out, 'i18n', 'member.json'), 'utf-8'));

        expect(component).toContain("t('admin.");
        expect(Object.keys(keys)).toEqual(['admin']);
      },
      GENERATION_TIMEOUT,
    );
  });
});
