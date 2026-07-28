import { describe, expect, it } from 'vitest';
import { detectPjtgAnnotation, parsePjtgAnnotation } from '../src/typed-json/annotation-parser';

describe('PJTG annotation parser: the two recognised forms', () => {
  it('reads a bare namespace reference', () => {
    const result = parsePjtgAnnotation('[WorkflowNode]');
    expect(result.annotation).toEqual({
      kind: 'namespace-ref',
      value: 'WorkflowNode',
      raw: '[WorkflowNode]',
      line: 0,
    });
    expect(result.warnings).toEqual([]);
  });

  it('reads an inline TypeScript type', () => {
    const result = parsePjtgAnnotation("!['A' | 'B']");
    expect(result.annotation).toMatchObject({
      kind: 'inline-type',
      value: "'A' | 'B'",
      raw: "!['A' | 'B']",
    });
  });

  it('keeps the inner brackets of a nested inline type', () => {
    const result = parsePjtgAnnotation('![[number[]][]]');
    expect(result.annotation).toMatchObject({
      kind: 'inline-type',
      value: '[number[]][]',
    });
  });

  it('tolerates leading and trailing whitespace on the annotation line', () => {
    const result = parsePjtgAnnotation('   [Simple]   ');
    expect(result.annotation).toMatchObject({ kind: 'namespace-ref', value: 'Simple' });
  });

  it('returns no annotation for empty or missing documentation', () => {
    for (const doc of [undefined, null, '', '   ', '\n\n']) {
      const result = parsePjtgAnnotation(doc as string | undefined);
      expect(result.annotation).toBeNull();
      expect(result.warnings).toEqual([]);
    }
  });

  it('detectPjtgAnnotation is a cheap yes/no matching the full parse', () => {
    expect(detectPjtgAnnotation('[Simple]')).toBe(true);
    expect(detectPjtgAnnotation('![1]')).toBe(true);
    expect(detectPjtgAnnotation('just prose')).toBe(false);
    expect(detectPjtgAnnotation('See [the docs](https://example.com)')).toBe(false);
    expect(detectPjtgAnnotation(undefined)).toBe(false);
  });
});

describe('PJTG annotation parser: multi-line documentation', () => {
  it('finds an annotation below prose', () => {
    const doc = ['The workflow graph.', 'Kept in sync with the editor.', '[WorkflowNode]'].join(
      '\n',
    );
    const result = parsePjtgAnnotation(doc);
    expect(result.annotation).toMatchObject({
      kind: 'namespace-ref',
      value: 'WorkflowNode',
      line: 2,
    });
  });

  it('finds an annotation above prose', () => {
    const doc = ['![1 | 2]', 'Legacy tier marker.'].join('\n');
    const result = parsePjtgAnnotation(doc);
    expect(result.annotation).toMatchObject({ kind: 'inline-type', value: '1 | 2', line: 0 });
  });

  it('handles CRLF line endings', () => {
    const result = parsePjtgAnnotation('prose\r\n[Simple]\r\nmore prose');
    expect(result.annotation).toMatchObject({ kind: 'namespace-ref', value: 'Simple' });
  });

  it('reads an annotation whose type text spans several lines', () => {
    const doc = ['![{', '  a: string;', '  b?: number;', '}]'].join('\n');
    const result = parsePjtgAnnotation(doc);
    expect(result.annotation).toMatchObject({ kind: 'inline-type' });
    expect(result.annotation?.value).toContain('a: string;');
    expect(result.annotation?.value).toContain('b?: number;');
  });

  it('exposes the documentation with annotation lines removed', () => {
    const doc = ['The workflow graph.', '[WorkflowNode]', 'Second paragraph.'].join('\n');
    const result = parsePjtgAnnotation(doc);
    expect(result.strippedDocumentation).toBe('The workflow graph.\nSecond paragraph.');
  });
});

describe('PJTG annotation parser: what is NOT an annotation', () => {
  const notAnnotations: Array<[string, string]> = [
    ['markdown link at line start', '[the docs](https://example.com)'],
    ['markdown image at line start', '![a diagram](https://example.com/d.png)'],
    ['markdown link inside prose', 'See [the docs](https://example.com) for details.'],
    ['prose containing brackets', 'Values are stored as [key, value] pairs.'],
    ['bracketed prose', '[see the docs]'],
    ['bracketed prose with punctuation', '[TODO: fix this]'],
    ['unbalanced opening bracket', '[WorkflowNode'],
    ['unbalanced closing bracket', 'WorkflowNode]'],
    ['annotation with trailing prose on the same line', '[WorkflowNode] the graph nodes'],
    ['annotation with leading prose on the same line', 'the graph nodes [WorkflowNode]'],
    ['two bracket groups on one line', '[A] [B]'],
    ['dotted name', '[PrismaJson.Simple]'],
    ['empty brackets', '[]'],
    ['a plain zod annotation', '@zod.min(1)'],
    ['an array index in prose', 'defaults to items[0]'],
  ];

  for (const [name, doc] of notAnnotations) {
    it(`rejects: ${name}`, () => {
      const result = parsePjtgAnnotation(doc);
      expect(result.annotation).toBeNull();
    });
  }

  it('does not warn about markdown links or images', () => {
    expect(parsePjtgAnnotation('![a diagram](https://example.com/d.png)').warnings).toEqual([]);
    expect(parsePjtgAnnotation('[the docs](https://example.com)').warnings).toEqual([]);
  });

  it('warns about an unbalanced inline annotation rather than guessing', () => {
    const result = parsePjtgAnnotation('![{ a: string');
    expect(result.annotation).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/unbalanced/i);
  });

  it('warns about an empty inline annotation', () => {
    const result = parsePjtgAnnotation('![]');
    expect(result.annotation).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/empty/i);
  });

  it('ignores brackets that sit inside a string literal in prose', () => {
    const result = parsePjtgAnnotation("The default is '[]' for a new workflow.");
    expect(result.annotation).toBeNull();
  });
});

describe('PJTG annotation parser: coexistence with @zod annotations', () => {
  it('reports a PJTG annotation alongside an unrelated @zod chain', () => {
    const doc = ['[WorkflowNode]', '@zod.describe("the graph")'].join('\n');
    const result = parsePjtgAnnotation(doc);
    expect(result.annotation).toMatchObject({ kind: 'namespace-ref', value: 'WorkflowNode' });
    expect(result.hasZodAnnotations).toBe(true);
    expect(result.hasZodCustomUse).toBe(false);
  });

  it('flags @zod.custom.use as the winner', () => {
    const doc = ['[WorkflowNode]', '@zod.custom.use(z.array(WorkflowNodeSchema))'].join('\n');
    const result = parsePjtgAnnotation(doc);
    expect(result.annotation).toMatchObject({ kind: 'namespace-ref' });
    expect(result.hasZodCustomUse).toBe(true);
  });

  it('flags the import-prefixed form of @zod.custom.use too', () => {
    const doc = '[X]\n@zod.import(["import { S } from \'./s\'"]).custom.use(S)';
    expect(parsePjtgAnnotation(doc).hasZodCustomUse).toBe(true);
  });

  it('flags @zod.custom({...}) as a base-schema override', () => {
    const result = parsePjtgAnnotation('![1]\n@zod.custom({ schema: "z.number()" })');
    expect(result.hasZodCustom).toBe(true);
  });

  it('does not mistake the word custom.use in prose for a zod override', () => {
    const result = parsePjtgAnnotation('[X]\nWe custom.use this elsewhere.');
    expect(result.hasZodCustomUse).toBe(false);
    expect(result.hasZodAnnotations).toBe(false);
  });
});

describe('PJTG annotation parser: ambiguity is never resolved by guessing', () => {
  it('refuses two different annotations on one field', () => {
    const result = parsePjtgAnnotation('[Simple]\n![1]');
    expect(result.annotation).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/more than one/i);
  });

  it('accepts the same annotation repeated verbatim', () => {
    const result = parsePjtgAnnotation('[Simple]\n[Simple]');
    expect(result.annotation).toMatchObject({ kind: 'namespace-ref', value: 'Simple' });
    expect(result.warnings).toEqual([]);
  });
});
