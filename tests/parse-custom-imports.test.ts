import { describe, expect, it } from 'vitest';
import {
  FieldCommentContext,
  ModelCommentContext,
  parseCustomImports,
} from '../src/parsers/zod-comments';

describe('parseCustomImports', () => {
  const baseModelContext = (comment: string): ModelCommentContext => ({
    modelName: 'SampleModel',
    comment,
  });

  const baseFieldContext = (comment: string): FieldCommentContext => ({
    modelName: 'SampleModel',
    fieldName: 'sampleField',
    fieldType: 'String',
    comment,
    isOptional: false,
    isList: false,
  });

  it('parses combined default and named imports from a single entry', () => {
    const comment = '@zod.import([\'import Foo, { bar as baz } from "pkg"\'])';
    const result = parseCustomImports(comment, baseModelContext(comment));

    expect(result.isValid).toBe(true);
    expect(result.imports).toHaveLength(1);

    const customImport = result.imports[0];
    expect(customImport.source).toBe('pkg');
    expect(customImport.isDefault).toBe(true);
    expect(customImport.isNamespace).toBe(false);
    expect(customImport.importedItems).toEqual(['Foo', 'baz']);
  });

  it('splits multiple import statements contained in a single array element', () => {
    const comment = '@zod.import(["import { bar } from \'pkg1\'; import * as utils from "pkg2""])';
    const result = parseCustomImports(comment, baseModelContext(comment));

    expect(result.isValid).toBe(true);
    expect(result.imports).toHaveLength(2);

    const [namedImport, namespaceImport] = result.imports;
    expect(namedImport.source).toBe('pkg1');
    expect(namedImport.importedItems).toEqual(['bar']);

    expect(namespaceImport.source).toBe('pkg2');
    expect(namespaceImport.isNamespace).toBe(true);
    expect(namespaceImport.importedItems).toEqual(['utils']);
  });

  it('handles single-quoted arrays with trailing commas and preserves custom schema', () => {
    const comment =
      '@zod.import([\'import { baz } from "pkg3"\',]).custom.use(z.string().refine((value) => value.length > 0))';
    const result = parseCustomImports(comment, baseFieldContext(comment));

    expect(result.isValid).toBe(true);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('pkg3');
    expect(result.imports[0].importedItems).toEqual(['baz']);
    expect(result.customSchema).toBe('z.string().refine((value) => value.length > 0)');
  });
});
