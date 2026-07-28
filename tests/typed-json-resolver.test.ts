import { describe, expect, it } from 'vitest';
import type {
  ResolvedTypedJsonConfig,
  TypedJsonConfig,
  TypedJsonFieldContext,
} from '../src/typed-json';
import { resolveTypedJsonConfig, resolveTypedJsonField } from '../src/typed-json';

/** Build the resolved config an emitter would hold, from the user-facing block. */
function configure(typedJson: TypedJsonConfig): ResolvedTypedJsonConfig {
  return resolveTypedJsonConfig({ typedJson })!;
}

const MODULE_CONFIG = configure({ schemaModule: './json-types' });

function field(
  documentation: string,
  overrides: Partial<TypedJsonFieldContext> = {},
): TypedJsonFieldContext {
  return { modelName: 'Workflow', fieldName: 'nodes', documentation, ...overrides };
}

function resolvedOrThrow(
  context: TypedJsonFieldContext,
  config: ResolvedTypedJsonConfig | undefined = MODULE_CONFIG,
) {
  const result = resolveTypedJsonField(context, config);
  if (result.status !== 'resolved') {
    throw new Error(`expected resolution, got ${result.status}: ${JSON.stringify(result)}`);
  }
  return result;
}

describe('typedJson resolver: the regression contract', () => {
  it('does nothing at all when typedJson is not configured', () => {
    for (const config of [undefined, null]) {
      const result = resolveTypedJsonField(
        field('[WorkflowNode]'),
        config as ResolvedTypedJsonConfig | undefined,
      );
      expect(result.status).toBe('none');
      expect(result.warnings).toEqual([]);
    }
  });

  it('stays silent for an unannotated field even when configured', () => {
    expect(resolveTypedJsonField(field(''), MODULE_CONFIG).status).toBe('none');
    expect(resolveTypedJsonField(field('Some prose.'), MODULE_CONFIG).status).toBe('none');
    expect(resolveTypedJsonField(field('@zod.min(1)'), MODULE_CONFIG).status).toBe('none');
    expect(resolveTypedJsonField({ modelName: 'W', fieldName: 'n' }, MODULE_CONFIG).status).toBe(
      'none',
    );
  });
});

describe('typedJson resolver: [TypeName] resolution order', () => {
  it('takes an explicit map entry first, and needs no import for it', () => {
    const result = resolvedOrThrow(
      field('[WorkflowNode]'),
      configure({
        schemaModule: './json-types',
        map: { WorkflowNode: 'z.record(z.string(), z.unknown())' },
      }),
    );
    expect(result.expression).toBe('z.record(z.string(), z.unknown())');
    expect(result.imports).toEqual([]);
  });

  it('falls back to <TypeName>Schema from schemaModule', () => {
    const result = resolvedOrThrow(field('[WorkflowNode]'));
    expect(result.expression).toBe('WorkflowNodeSchema');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].importedItems).toEqual(['WorkflowNodeSchema']);
  });

  it('honours a custom schemaSuffix', () => {
    const result = resolvedOrThrow(
      field('[WorkflowNode]'),
      configure({ schemaModule: './json-types', schemaSuffix: 'Validator' }),
    );
    expect(result.expression).toBe('WorkflowNodeValidator');
  });

  it('accepts an empty schemaSuffix', () => {
    const result = resolvedOrThrow(
      field('[WorkflowNode]'),
      configure({ schemaModule: './json-types', schemaSuffix: '' }),
    );
    expect(result.expression).toBe('WorkflowNode');
  });

  it('is unconvertible, with a reason naming the type, when nothing resolves', () => {
    const result = resolveTypedJsonField(field('[WorkflowNode]'), configure({}));
    expect(result.status).toBe('unconvertible');
    expect(result.reason).toContain('WorkflowNode');
    expect(result.reason).toMatch(/schemaModule|map/);
  });
});

describe('typedJson resolver: ![inline type] conversion', () => {
  it('converts an inline literal without needing any import', () => {
    const result = resolvedOrThrow(field('![1]'));
    expect(result.expression).toBe('z.literal(1)');
    expect(result.imports).toEqual([]);
  });

  it('converts an inline string union', () => {
    expect(resolvedOrThrow(field("!['A' | 'B']")).expression).toBe("z.enum(['A', 'B'])");
  });

  it('resolves references inside an inline type and imports them', () => {
    const result = resolvedOrThrow(field('![WorkflowNode[]]'));
    expect(result.expression).toBe('z.array(WorkflowNodeSchema)');
    expect(result.imports[0].importedItems).toEqual(['WorkflowNodeSchema']);
  });

  it('groups several references from one module into a single import', () => {
    const result = resolvedOrThrow(field('![{ a: Alpha; b: Beta; c: Alpha }]'));
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].importedItems).toEqual(['AlphaSchema', 'BetaSchema']);
    expect(result.imports[0].importStatement).toBe(
      "import { AlphaSchema, BetaSchema } from './json-types'",
    );
  });

  it('resolves a namespace-qualified reference when the namespace matches', () => {
    expect(resolvedOrThrow(field('![PrismaJson.WorkflowNode]')).expression).toBe(
      'WorkflowNodeSchema',
    );
  });

  it('honours a custom namespace name', () => {
    expect(
      resolvedOrThrow(
        field('![PStringJson.WithType]'),
        configure({ schemaModule: './json-types', namespace: 'PStringJson' }),
      ).expression,
    ).toBe('WithTypeSchema');
  });

  it('refuses a qualified reference from an unrelated namespace', () => {
    const result = resolveTypedJsonField(field('![SomeOther.WorkflowNode]'), MODULE_CONFIG);
    expect(result.status).toBe('unconvertible');
    expect(result.reason).toContain('SomeOther.WorkflowNode');
  });

  it('reports an unconvertible inline type with the construct that defeated it', () => {
    const result = resolveTypedJsonField(field('![Record<string, number>]'), MODULE_CONFIG);
    expect(result.status).toBe('unconvertible');
    expect(result.reason).toMatch(/generic/i);
    expect(result.reason).toContain('Workflow.nodes');
  });
});

describe('typedJson resolver: list fields', () => {
  it('treats the annotation as the element type and wraps the field', () => {
    const result = resolvedOrThrow(field('![3]', { isList: true }));
    expect(result.elementExpression).toBe('z.literal(3)');
    expect(result.expression).toBe('z.array(z.literal(3))');
  });

  it('leaves a non-list field unwrapped', () => {
    const result = resolvedOrThrow(field('![3]', { isList: false }));
    expect(result.elementExpression).toBe('z.literal(3)');
    expect(result.expression).toBe('z.literal(3)');
  });

  it('never produces the postfix .array() form, which the CRUD emitter mis-reads', () => {
    for (const doc of ['![3]', '![number[]]', '![[number[]][]]', '[WorkflowNode]']) {
      const result = resolvedOrThrow(field(doc, { isList: true }));
      expect(result.expression).not.toContain('.array()');
      expect(result.elementExpression).not.toContain('.array()');
    }
  });

  it('warns when a map entry smuggles the postfix form into a list field', () => {
    // typedJson.map takes a verbatim expression, so it is the one place a user
    // can supply `X.array()`. On a list field the CRUD emitter would then skip
    // its own wrapper and emit a schema one dimension too shallow, which
    // rejects valid production data.
    const mapped = configure({ map: { WorkflowNode: 'WorkflowNodeSchema.array()' } });

    const list = resolveTypedJsonField(field('[WorkflowNode]', { isList: true }), mapped);
    expect(list.status).toBe('resolved');
    expect(list.warnings.join(' ')).toMatch(/\.array\(\)/);
    expect(list.warnings.join(' ')).toContain('Workflow.nodes');

    // Not a list, no wrapper to lose, so nothing to warn about.
    const single = resolveTypedJsonField(field('[WorkflowNode]', { isList: false }), mapped);
    expect(single.warnings).toEqual([]);
  });

  it('adds no optionality of its own; the caller owns that', () => {
    const result = resolvedOrThrow(field('![2]', { isOptional: true }));
    expect(result.expression).toBe('z.literal(2)');
  });
});

describe('typedJson resolver: import specifiers per output directory', () => {
  const cases: Array<[string | undefined, string]> = [
    [undefined, './json-types'],
    ['', './json-types'],
    ['schemas', '../json-types'],
    ['schemas/objects', '../../json-types'],
    ['schemas/models', '../../json-types'],
    ['schemas/variants/pure', '../../../json-types'],
    ['schemas/results', '../../json-types'],
  ];

  for (const [outputSubdir, expected] of cases) {
    it(`resolves ./json-types to ${expected} from ${outputSubdir ?? '(root)'}`, () => {
      const result = resolvedOrThrow(field('[WorkflowNode]', { outputSubdir }));
      expect(result.imports[0].source).toBe(expected);
      expect(result.imports[0].importStatement).toBe(
        `import { WorkflowNodeSchema } from '${expected}'`,
      );
    });
  }

  it('normalises Windows separators in the output subdirectory', () => {
    const result = resolvedOrThrow(field('[WorkflowNode]', { outputSubdir: 'schemas\\objects' }));
    expect(result.imports[0].source).toBe('../../json-types');
  });

  it('leaves a package specifier alone', () => {
    for (const outputSubdir of [undefined, 'schemas/objects', 'schemas/variants/pure']) {
      const result = resolvedOrThrow(
        field('[WorkflowNode]', { outputSubdir }),
        configure({ schemaModule: '@acme/json-types' }),
      );
      expect(result.imports[0].source).toBe('@acme/json-types');
    }
  });

  it('appends an import extension to relative specifiers only', () => {
    expect(
      resolvedOrThrow(field('[X]', { outputSubdir: 'schemas/objects', importExtension: '.js' }))
        .imports[0].source,
    ).toBe('../../json-types.js');

    expect(
      resolvedOrThrow(
        field('[X]', { outputSubdir: 'schemas/objects', importExtension: '.js' }),
        configure({ schemaModule: '@acme/json-types' }),
      ).imports[0].source,
    ).toBe('@acme/json-types');
  });

  it('does not double up an extension already present', () => {
    expect(
      resolvedOrThrow(
        field('[X]', { importExtension: '.js' }),
        configure({ schemaModule: './json-types.js' }),
      ).imports[0].source,
    ).toBe('./json-types.js');
  });

  it('emits a plain named value import, never a type-only one', () => {
    const imported = resolvedOrThrow(field('[X]')).imports[0];
    expect(imported).toMatchObject({ isDefault: false, isNamespace: false, isTypeOnly: false });
    expect(imported.originalStatement).toBe(imported.importStatement);
  });
});

describe('typedJson resolver: the @db.VarChar hazard signal', () => {
  // The CRUD emitter appends `.max(n)` for `@db.VarChar(n)` on any String field,
  // and does it whether or not the base schema was replaced. Appending .max() to
  // z.enum([...]) emits a module that throws on import, so the emitter needs to
  // know whether the replacement can still take a length constraint.
  it('is true only for a z.string()-rooted expression', () => {
    expect(resolvedOrThrow(field('![string]')).allowsStringLengthConstraints).toBe(true);
    expect(resolvedOrThrow(field('![string | null]')).allowsStringLengthConstraints).toBe(true);
  });

  it('is false for an enum, a literal, an object and an imported schema', () => {
    for (const doc of [
      "!['A' | 'B']",
      '![1]',
      '![{ a: string }]',
      '[WorkflowNode]',
      '![string[]]',
    ]) {
      expect(
        resolvedOrThrow(field(doc)).allowsStringLengthConstraints,
        `${doc} must not accept .max()`,
      ).toBe(false);
    }
  });

  it('is false for a list field, whose expression is an array', () => {
    expect(
      resolvedOrThrow(field('![string]', { isList: true })).allowsStringLengthConstraints,
    ).toBe(false);
  });
});

describe('typedJson resolver: @zod.custom.use wins', () => {
  it('reports superseded when .custom.use is present alongside an annotation', () => {
    const result = resolveTypedJsonField(
      field('[WorkflowNode]\n@zod.custom.use(z.array(WorkflowNodeSchema))'),
      MODULE_CONFIG,
    );
    expect(result.status).toBe('superseded');
    expect(result.reason).toMatch(/custom\.use/);
  });

  it('reports superseded for @zod.custom({ ... }) too', () => {
    const result = resolveTypedJsonField(
      field('![1]\n@zod.custom({ schema: "z.number()" })'),
      MODULE_CONFIG,
    );
    expect(result.status).toBe('superseded');
  });

  it('stays out of the way when only @zod.custom.use is present', () => {
    const result = resolveTypedJsonField(
      field('@zod.custom.use(z.array(WorkflowNodeSchema))'),
      MODULE_CONFIG,
    );
    expect(result.status).toBe('none');
  });

  it('still resolves alongside an ordinary @zod chain', () => {
    const result = resolvedOrThrow(field('[WorkflowNode]\n@zod.describe("graph")'));
    expect(result.expression).toBe('WorkflowNodeSchema');
    expect(result.hasZodAnnotations).toBe(true);
  });
});

describe('typedJson resolver: ambiguity and diagnostics', () => {
  it('refuses two conflicting annotations and says so', () => {
    const result = resolveTypedJsonField(field('[Simple]\n![1]'), MODULE_CONFIG);
    expect(result.status).toBe('unconvertible');
    expect(result.reason).toMatch(/more than one/i);
  });

  it('carries parser warnings through even when there is nothing to resolve', () => {
    const result = resolveTypedJsonField(field('![{ a: string'), MODULE_CONFIG);
    expect(result.warnings.join(' ')).toMatch(/unbalanced/i);
  });

  it('names the model and field in every reason, so the warning is actionable', () => {
    const result = resolveTypedJsonField(
      field('[Missing]', { modelName: 'Order', fieldName: 'meta' }),
      configure({}),
    );
    expect(result.reason).toContain('Order.meta');
  });

  it('states the field and the fallback exactly once, however the failure arose', () => {
    // An unresolved reference *inside* an inline type used to be reported twice:
    // the converter's reason already carried the prefix and the outer message
    // added it again. A warning nobody can read is a warning nobody acts on.
    for (const doc of ['[Foo]', '![{ a: Foo }]', '![Foo[]]']) {
      const result = resolveTypedJsonField(field(doc), configure({}));
      expect(result.status).toBe('unconvertible');
      const reason = result.status === 'unconvertible' ? result.reason : '';
      expect(reason.match(/Workflow\.nodes/g), reason).toHaveLength(1);
      expect(reason.match(/keeps its current schema/g), reason).toHaveLength(1);
      expect(reason).toContain('Foo');
    }
  });

  it('names the field alone when there is no model', () => {
    const result = resolveTypedJsonField(
      { fieldName: 'meta', documentation: '[Missing]' },
      configure({}),
    );
    expect(result.reason).toContain('meta');
  });

  it('degrades to unconvertible rather than crashing prisma generate', () => {
    // This runs inside `prisma generate`. Any exception escaping it aborts the
    // user's whole generate over one doc comment, so an unexpected internal
    // failure must leave the field as it is and say why instead of throwing.
    const hostile = {
      ...MODULE_CONFIG,
      get map(): Record<string, string> {
        throw new Error('config read blew up');
      },
    } as unknown as ResolvedTypedJsonConfig;

    let result!: ReturnType<typeof resolveTypedJsonField>;
    expect(() => {
      result = resolveTypedJsonField(field('[WorkflowNode]'), hostile);
    }).not.toThrow();
    expect(result.status).toBe('unconvertible');
    expect(result.reason).toContain('Workflow.nodes');
    expect(result.reason).toContain('config read blew up');
  });

  it('exposes the annotation it acted on', () => {
    const result = resolvedOrThrow(field('[WorkflowNode]'));
    expect(result.annotation).toMatchObject({ kind: 'namespace-ref', value: 'WorkflowNode' });
  });

  it('never throws, whatever the documentation says', () => {
    const junk = ['![', '![]', '[]', '!![x]', '[[[[', '![`a`]', '![{{{{'];
    for (const doc of junk) {
      expect(() => resolveTypedJsonField(field(doc), MODULE_CONFIG)).not.toThrow();
    }
  });
});
