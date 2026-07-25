import type { DMMF } from '@prisma/generator-helper';
import { existsSync } from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { ProGeneratorContext } from '../src/pro/core/ProGeneratorContext';
import type { FormSchema } from '../src/pro/features/form-ux/FormUXGenerator';

// The Pro feature set lives in a private submodule. It is present for the
// maintainer and in the release workflow (which checks it out with a deploy
// key), but not in ordinary CI runs or in forks, where a static import would
// fail to resolve and take the whole file down. Import it lazily and skip
// instead.
const PRO_FORM_UX = path.join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'form-ux',
  'FormUXGenerator.ts',
);
const proAvailable = existsSync(PRO_FORM_UX);

let FormUXGenerator: new (
  context: ProGeneratorContext,
  options: { uiLibrary: 'shadcn' | 'barebones'; enableI18n: boolean },
) => unknown;

const fakeDmmf = {
  datamodel: { models: [], enums: [], types: [] },
} as unknown as DMMF.Document;

function createContext(): ProGeneratorContext {
  return {
    dmmf: fakeDmmf,
    models: [],
    enums: [],
    generatorConfig: {} as ProGeneratorContext['generatorConfig'],
    schemaPath: 'prisma/schema.prisma',
    outputPath: 'prisma/generated/pro/forms',
    prismaClientPath: '@prisma/client',
    provider: 'postgresql',
    previewFeatures: [],
  };
}

const sampleSchema: FormSchema = {
  name: 'User',
  validationSchema: 'UserSchema',
  fields: [
    { name: 'email', type: 'String', label: 'Email', required: true, component: 'input' },
    { name: 'bio', type: 'String', label: 'Bio', required: false, component: 'textarea' },
    {
      name: 'isActive',
      type: 'Boolean',
      label: 'Is Active',
      required: false,
      component: 'checkbox',
    },
  ],
  defaultValues: {
    email: '',
    bio: '',
    isActive: false,
  },
};

function renderForm(uiLibrary: 'shadcn' | 'barebones'): string {
  const generator = new FormUXGenerator(createContext(), { uiLibrary, enableI18n: false });
  return (
    generator as unknown as {
      generateReactHookForm: (schema: FormSchema) => string;
    }
  ).generateReactHookForm(sampleSchema);
}

describe.skipIf(!proAvailable)('issue #375: shadcn form generation compatibility', () => {
  beforeAll(async () => {
    ({ FormUXGenerator } = await import('../src/pro/features/form-ux/FormUXGenerator'));
  });

  it('does not generate deprecated shadcn form imports/components', () => {
    const output = renderForm('shadcn');
    expect(output).not.toContain('@/components/ui/form');
    expect(output).not.toContain('<FormField');
    expect(output).not.toContain('<FormControl');
    expect(output).not.toContain('<FormMessage');
    expect(output).not.toContain('<Form {...form}>');
  });

  it('uses Controller-based wiring for shadcn custom components', () => {
    const output = renderForm('shadcn');
    expect(output).toContain("import { Controller, useForm } from 'react-hook-form';");
    expect(output).toContain('<Controller');
    expect(output).toContain('fieldState.error');
  });

  it('keeps barebones output unchanged', () => {
    const output = renderForm('barebones');
    expect(output).toContain("import { useForm } from 'react-hook-form';");
    expect(output).not.toContain("import { Controller, useForm } from 'react-hook-form';");
  });
});
