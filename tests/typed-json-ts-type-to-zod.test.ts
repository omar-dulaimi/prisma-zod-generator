import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convertTsTypeToZod } from '../src/typed-json/ts-type-to-zod';

/** Convenience: assert a successful conversion and return the expression. */
function convert(typeText: string, resolve?: (name: string) => string | null): string {
  const result = convertTsTypeToZod(typeText, {
    resolveTypeName: resolve
      ? (name) => {
          const expression = resolve(name);
          return expression === null ? { error: `unknown type ${name}` } : { expression };
        }
      : undefined,
  });
  if (!result.ok) {
    throw new Error(`expected "${typeText}" to convert, got: ${result.reason}`);
  }
  return result.expression;
}

/**
 * Convenience: assert a failed conversion and return the reason.
 *
 * Type references resolve by default so that structural reasons surface rather
 * than being masked by "cannot resolve X". `reasonWithoutResolver` covers the
 * unresolved case explicitly.
 */
function reasonFor(typeText: string): string {
  const result = convertTsTypeToZod(typeText, {
    resolveTypeName: (name) => ({ expression: `${name}Schema` }),
  });
  if (result.ok) {
    throw new Error(`expected "${typeText}" to be unconvertible, got: ${result.expression}`);
  }
  return result.reason;
}

function reasonWithoutResolver(typeText: string): string {
  const result = convertTsTypeToZod(typeText);
  if (result.ok) {
    throw new Error(`expected "${typeText}" to be unconvertible, got: ${result.expression}`);
  }
  return result.reason;
}

describe('ts-type-to-zod: primitives and keywords', () => {
  const cases: Array<[string, string]> = [
    ['string', 'z.string()'],
    ['number', 'z.number()'],
    ['boolean', 'z.boolean()'],
    ['bigint', 'z.bigint()'],
    ['null', 'z.null()'],
    ['undefined', 'z.undefined()'],
    ['any', 'z.any()'],
    ['unknown', 'z.unknown()'],
    ['never', 'z.never()'],
    ['true', 'z.literal(true)'],
    ['false', 'z.literal(false)'],
  ];

  for (const [input, expected] of cases) {
    it(`${input} -> ${expected}`, () => {
      expect(convert(input)).toBe(expected);
    });
  }
});

describe('ts-type-to-zod: single literals', () => {
  it('converts a bare numeric literal, which is upstream literal.prisma', () => {
    expect(convert('1')).toBe('z.literal(1)');
    expect(convert('2')).toBe('z.literal(2)');
    expect(convert('3')).toBe('z.literal(3)');
  });

  it('converts a negative and a fractional literal', () => {
    expect(convert('-1')).toBe('z.literal(-1)');
    expect(convert('1.5')).toBe('z.literal(1.5)');
    expect(convert('-2.75')).toBe('z.literal(-2.75)');
  });

  it('converts a bigint literal', () => {
    expect(convert('1n')).toBe('z.literal(1n)');
  });

  it('converts a single string literal', () => {
    expect(convert("'draft'")).toBe("z.literal('draft')");
  });
});

describe('ts-type-to-zod: unions', () => {
  it('turns an all-string-literal union into z.enum', () => {
    expect(convert("'A' | 'B'")).toBe("z.enum(['A', 'B'])");
    expect(convert("'draft' | 'published' | 'archived'")).toBe(
      "z.enum(['draft', 'published', 'archived'])",
    );
  });

  it('turns a numeric-literal union into a union of z.literal', () => {
    expect(convert('100 | 200 | 300')).toBe(
      'z.union([z.literal(100), z.literal(200), z.literal(300)])',
    );
    expect(convert('1.5 | 2.5 | 3.5')).toBe(
      'z.union([z.literal(1.5), z.literal(2.5), z.literal(3.5)])',
    );
  });

  it('turns a mixed union into a union of the converted members', () => {
    expect(convert("'a' | 1")).toBe("z.union([z.literal('a'), z.literal(1)])");
    expect(convert('string | number')).toBe('z.union([z.string(), z.number()])');
  });

  it('accepts a leading pipe', () => {
    expect(convert("| 'A' | 'B'")).toBe("z.enum(['A', 'B'])");
  });

  it('collapses a one-member union', () => {
    expect(convert('(string)')).toBe('z.string()');
  });

  it('rejects a dangling pipe rather than guessing', () => {
    expect(reasonFor("'A' |")).toMatch(/unexpected end/i);
  });
});

describe('ts-type-to-zod: null and undefined union members', () => {
  it('lifts null out of the union as .nullable()', () => {
    expect(convert('string | null')).toBe('z.string().nullable()');
    expect(convert("'A' | 'B' | null")).toBe("z.enum(['A', 'B']).nullable()");
  });

  it('lifts undefined out of the union as .optional()', () => {
    expect(convert('number | undefined')).toBe('z.number().optional()');
  });

  it('lifts both as .nullish()', () => {
    expect(convert('number | null | undefined')).toBe('z.number().nullish()');
  });

  it('keeps a bare null or undefined as its own schema', () => {
    expect(convert('null')).toBe('z.null()');
    expect(convert('undefined')).toBe('z.undefined()');
    expect(convert('null | undefined')).toBe('z.union([z.null(), z.undefined()])');
  });

  it('applies the modifier to the whole remaining union', () => {
    expect(convert('string | number | null')).toBe('z.union([z.string(), z.number()]).nullable()');
  });
});

describe('ts-type-to-zod: quoting', () => {
  it('accepts double-quoted literals and normalises to single quotes', () => {
    expect(convert('"A" | "B"')).toBe("z.enum(['A', 'B'])");
    expect(convert('"draft"')).toBe("z.literal('draft')");
  });

  it('handles a literal containing a pipe', () => {
    expect(convert("'a|b' | 'c'")).toBe("z.enum(['a|b', 'c'])");
  });

  it('handles a literal containing an escaped single quote', () => {
    expect(convert(String.raw`'it\'s' | 'other'`)).toBe(String.raw`z.enum(['it\'s', 'other'])`);
  });

  it('re-escapes a single quote that arrived inside double quotes', () => {
    expect(convert(`"it's"`)).toBe(String.raw`z.literal('it\'s')`);
  });

  it('handles a literal containing a backslash', () => {
    expect(convert(String.raw`'a\\b'`)).toBe(String.raw`z.literal('a\\b')`);
  });

  it('handles a literal containing brackets and braces', () => {
    expect(convert("'[]' | '{}'")).toBe("z.enum(['[]', '{}'])");
  });

  it('escapes newlines inside a literal', () => {
    expect(convert(String.raw`'a\nb'`)).toBe(String.raw`z.literal('a\nb')`);
  });

  it('rejects an unterminated string literal', () => {
    expect(reasonFor("'A")).toMatch(/unterminated/i);
  });
});

describe('ts-type-to-zod: arrays and tuples', () => {
  it('converts an array suffix to z.array', () => {
    expect(convert('string[]')).toBe('z.array(z.string())');
    expect(convert('number[][]')).toBe('z.array(z.array(z.number()))');
  });

  it('converts a tuple to z.tuple, which is what enforces arity', () => {
    expect(convert('[string, number]')).toBe('z.tuple([z.string(), z.number()])');
    expect(convert('[number[]]')).toBe('z.tuple([z.array(z.number())])');
  });

  it('converts the corpus tuple-arrayed case from array.prisma', () => {
    expect(convert('[number[]][]')).toBe('z.array(z.tuple([z.array(z.number())]))');
  });

  it('binds the array suffix tighter than the union', () => {
    expect(convert("'a' | 'b'[]")).toBe("z.union([z.literal('a'), z.array(z.literal('b'))])");
    expect(convert("('a' | 'b')[]")).toBe("z.array(z.enum(['a', 'b']))");
  });

  it('accepts a trailing comma in a tuple', () => {
    expect(convert('[string,]')).toBe('z.tuple([z.string()])');
  });

  it('rejects an empty tuple, which zod cannot express usefully here', () => {
    expect(reasonFor('[]')).toMatch(/empty tuple/i);
  });

  it('rejects a labelled tuple member', () => {
    expect(reasonFor('[a: string, b: number]')).toMatch(/labell?ed tuple/i);
  });

  it('rejects an optional tuple member', () => {
    expect(reasonFor('[string?]')).toMatch(/optional tuple/i);
  });

  it('rejects a rest element', () => {
    expect(reasonFor('[...string[]]')).toMatch(/rest element/i);
  });

  it('accepts readonly, which has no runtime meaning', () => {
    expect(convert('readonly string[]')).toBe('z.array(z.string())');
  });
});

describe('ts-type-to-zod: object types', () => {
  it('converts a flat object', () => {
    expect(convert('{ a: string; b: number }')).toBe('z.object({ a: z.string(), b: z.number() })');
  });

  it('converts an optional marker to .optional()', () => {
    expect(convert('{ a?: string }')).toBe('z.object({ a: z.string().optional() })');
  });

  it('accepts comma separators and a trailing separator', () => {
    expect(convert('{ a: string, b: number, }')).toBe('z.object({ a: z.string(), b: z.number() })');
  });

  it('converts nested objects', () => {
    expect(convert('{ a: { b: { c: string } } }')).toBe(
      'z.object({ a: z.object({ b: z.object({ c: z.string() }) }) })',
    );
  });

  it('converts the corpus object shapes', () => {
    expect(convert('{ tier: string; enabled: boolean }')).toBe(
      'z.object({ tier: z.string(), enabled: z.boolean() })',
    );
    expect(convert(`{ theme: 'dark' | 'light'; language?: string }`)).toBe(
      "z.object({ theme: z.enum(['dark', 'light']), language: z.string().optional() })",
    );
  });

  it('quotes a property name that is not a bare identifier', () => {
    expect(convert(`{ 'a-b': string }`)).toBe("z.object({ 'a-b': z.string() })");
    expect(convert('{ 0: string }')).toBe("z.object({ '0': z.string() })");
  });

  it('accepts readonly members', () => {
    expect(convert('{ readonly a: string }')).toBe('z.object({ a: z.string() })');
  });

  it('rejects the empty object type, which means any non-nullish value in TypeScript', () => {
    expect(reasonFor('{}')).toMatch(/empty object type/i);
  });

  it('rejects an index signature', () => {
    expect(reasonFor('{ [key: string]: number }')).toMatch(/index signature/i);
  });

  it('rejects a mapped type', () => {
    expect(reasonFor('{ [K in Keys]: number }')).toMatch(/index signature|mapped type/i);
  });

  it('rejects a method signature', () => {
    expect(reasonFor('{ run(): void }')).toMatch(/method|function/i);
  });

  it('rejects a duplicate property rather than silently dropping one', () => {
    expect(reasonFor('{ a: string; a: number }')).toMatch(/duplicate/i);
  });
});

describe('ts-type-to-zod: whitespace and newlines anywhere', () => {
  it('tolerates newlines inside a union', () => {
    expect(convert("  'A'\n  |\n  'B'  ")).toBe("z.enum(['A', 'B'])");
  });

  it('tolerates newlines inside an object', () => {
    expect(convert('{\n  a: string;\n  b?: number;\n}')).toBe(
      'z.object({ a: z.string(), b: z.number().optional() })',
    );
  });

  it('tolerates newlines inside a tuple and an array suffix', () => {
    expect(convert('[\n  number [ ]\n] [ ]')).toBe('z.array(z.tuple([z.array(z.number())]))');
  });

  it('rejects an empty type text', () => {
    expect(reasonFor('   \n  ')).toMatch(/empty/i);
  });
});

describe('ts-type-to-zod: type references', () => {
  it('resolves a bare identifier through the supplied resolver', () => {
    expect(convert('WorkflowNode', (name) => `${name}Schema`)).toBe('WorkflowNodeSchema');
  });

  it('resolves references nested inside other constructs', () => {
    expect(convert('{ nodes: WorkflowNode[] }', (name) => `${name}Schema`)).toBe(
      'z.object({ nodes: z.array(WorkflowNodeSchema) })',
    );
  });

  it('reports every referenced name', () => {
    const result = convertTsTypeToZod('{ a: Foo; b: Bar[]; c: Foo }', {
      resolveTypeName: (name) => ({ expression: `${name}Schema` }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.referencedTypeNames).toEqual(['Foo', 'Bar']);
    }
  });

  it('is unconvertible when a reference cannot be resolved, and says which', () => {
    expect(reasonWithoutResolver('WorkflowNode')).toContain('WorkflowNode');
    expect(reasonWithoutResolver('{ a: Foo }')).toContain('Foo');
  });

  it('surfaces the resolver error verbatim', () => {
    const result = convertTsTypeToZod('Foo', {
      resolveTypeName: () => ({ error: 'no typedJson.schemaModule is configured' }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('no typedJson.schemaModule is configured');
    }
  });

  it('passes a dotted name through to the resolver whole', () => {
    const seen: string[] = [];
    convertTsTypeToZod('PrismaJson.Simple', {
      resolveTypeName: (name) => {
        seen.push(name);
        return { expression: 'SimpleSchema' };
      },
    });
    expect(seen).toEqual(['PrismaJson.Simple']);
  });
});

describe('ts-type-to-zod: everything else is unconvertible, with a reason', () => {
  const cases: Array<[string, RegExp]> = [
    ['Record<string, number>', /generic/i],
    ['Array<string>', /generic/i],
    ['Partial<Foo>', /generic/i],
    ['A & B', /intersection/i],
    ['keyof Foo', /keyof/i],
    ['typeof foo', /typeof/i],
    ['() => void', /function/i],
    ['(a: string) => number', /function/i],
    ['new () => Foo', /function|constructor/i],
    ['Foo extends Bar ? 1 : 2', /conditional/i],
    ['`a-${string}`', /template literal/i],
    ['string & {}', /intersection/i],
    ['object', /object/i],
    ['Foo[number]', /indexed access/i],
    ['string || number', /unexpected/i],
    ['a a', /unexpected/i],
    ['{ a: string', /unbalanced|unexpected end/i],
    ['#private', /unexpected/i],
  ];

  for (const [input, pattern] of cases) {
    it(`rejects ${input}`, () => {
      expect(reasonFor(input)).toMatch(pattern);
    });
  }

  it('rejects a type nested past the depth limit rather than blowing the stack', () => {
    const deep = 'string' + '[]'.repeat(200);
    const result = convertTsTypeToZod(deep);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/too deep/i);
  });

  it('never throws, whatever it is handed', () => {
    const junk = ['', '???', '<<<>>>', '((((', '}}}}', ' ', 'a'.repeat(10000)];
    for (const input of junk) {
      expect(() => convertTsTypeToZod(input)).not.toThrow();
    }
  });
});

describe('ts-type-to-zod: the .array() invariant', () => {
  // The CRUD emitter appends a list wrapper only when the expression does not
  // already contain the substring `.array()` (transformer.ts, the
  // `if (!line.includes('.array()'))` guard). A converted expression carrying
  // that substring would silently lose its outer array and end up one
  // dimension too shallow, which rejects valid production data.
  const inputs = [
    'string[]',
    'number[][]',
    '[number[]][]',
    '{ a: string[] }',
    "('a' | 'b')[]",
    'string[] | null',
    '[string, number[]][]',
  ];

  for (const input of inputs) {
    it(`${input} never emits the postfix .array() form`, () => {
      expect(convert(input)).not.toContain('.array()');
    });
  }
});

describe('ts-type-to-zod: the emitted expression is executed, not just read', () => {
  // Reading correct and validating correct are different properties. Every case
  // here evaluates the converted string as real Zod and runs values through it.
  const cases: Array<[string, unknown[], unknown[]]> = [
    ["'A' | 'B'", ['A', 'B'], ['C', 1, null]],
    [String.raw`'it\'s' | 'x'`, ["it's", 'x'], ['its']],
    ["'a|b' | 'c'", ['a|b', 'c'], ['a', 'b']],
    [String.raw`'a\nb'`, ['a\nb'], ['ab']],
    [String.raw`'a\\b'`, ['a\\b'], ['ab']],
    ['1n', [1n], [1]],
    ['-2.75', [-2.75], [2.75]],
    ['[number[]][]', [[[[1, 2]]], []], [[[[1, 2], [3]]], ['x']]],
    ['{ a?: string }', [{}, { a: 'x' }], [{ a: 1 }]],
    ['{ 0: string }', [{ 0: 'x' }], [{ 0: 1 }]],
    [`{ 'a-b': string }`, [{ 'a-b': 'x' }], [{ 'a-b': 1 }]],
    ['string | null', ['x', null], [1, undefined]],
    ['number | null | undefined', [1, null, undefined], ['x']],
    ['null | undefined', [null, undefined], [1]],
    ['[string, number]', [['a', 1]], [['a'], ['a', 1, 2], ['a', 'b']]],
    ['boolean | null', [true, false, null], ['true']],
    ["('a' | 'b')[]", [['a', 'b'], []], [['c']]],
    ['1 | 2 | 3', [1, 2, 3], [4, '1']],
    ['{ a: { b: string } }', [{ a: { b: 'x' } }], [{ a: { b: 1 } }, { a: {} }]],
    ['true', [true], [false, 1]],
    ['never', [], [1, null, undefined, 'x']],
    ['string[]', [['a'], []], ['a', [1]]],
  ];

  for (const [input, accept, reject] of cases) {
    it(`${input} validates as written`, () => {
      const expression = convert(input);
      const schema = new Function('z', `"use strict"; return (${expression});`)(z) as z.ZodType;

      for (const value of accept) {
        expect(
          schema.safeParse(value).success,
          `${expression} should accept ${String(value)}`,
        ).toBe(true);
      }
      for (const value of reject) {
        expect(
          schema.safeParse(value).success,
          `${expression} should reject ${JSON.stringify(value)}`,
        ).toBe(false);
      }
    });
  }
});
