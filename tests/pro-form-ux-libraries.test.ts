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

  const shadcnOnlyComponents = ['<FormField', '<FormItem', '<FormControl', '<FormMessage'];

  describe.each(['mui', 'chakra', 'mantine'])('uiLibrary: %s', (library) => {
    it(
      'emits components that reference only what they import',
      async () => {
        const out = await generate(`lib-${library}`, { uiLibrary: library });
        const source = readFileSync(join(out, 'components', 'MemberForm.tsx'), 'utf-8');

        for (const component of shadcnOnlyComponents) {
          if (source.includes(component)) {
            // If a shadcn primitive is used, it must be imported.
            expect(source, `${component} used without an import`).toMatch(
              /from '@\/components\/ui\/form'/,
            );
          }
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'warns that the library is not implemented and says what it produced',
      async () => {
        const logged: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...args) => {
          logged.push(args.join(' '));
        });

        await generate(`warn-${library}`, { uiLibrary: library });

        const output = logged.join('\n');
        expect(output).toContain(library);
        expect(output.toLowerCase()).toContain('barebones');
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
