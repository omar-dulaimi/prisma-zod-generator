import type { DMMF } from '@prisma/generator-helper';
import { describe, expect, it } from 'vitest';

import type { ProGeneratorContext } from '../src/pro/core/ProGeneratorContext';
import { type FormSchema, FormUXGenerator } from '../src/pro/features/form-ux/FormUXGenerator';

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

describe('issue #375: shadcn form generation compatibility', () => {
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
