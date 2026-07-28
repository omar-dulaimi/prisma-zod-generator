import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Typed JSON and typed scalar fields, wired into the emitters.
 *
 * The regression contract outranks the feature: with no `typedJson` block the
 * generated tree must be byte-identical to 3.0.0, PJTG annotations present or
 * not. That whole-tree proof lives in the baseline fixture; what this file pins
 * is the observable behaviour on both sides of the switch, plus the shapes the
 * upstream corpus asserts on.
 */

const SCHEMA_BODY = `
model Workflow {
  id Int @id @default(autoincrement())

  /// [WorkflowNode]
  nodes Json

  /// [WorkflowNode]
  meta Json?

  /// [WorkflowNode]
  steps Json[]

  plainJson Json

  /// !['draft' | 'published']
  status String

  /// ![1 | 2 | 3]
  tier Int

  /// [Ratio]
  ratio Float

  /// [Tag]
  tags String[]

  plainString String
}
`;

/**
 * Hand-written module the annotations resolve against. `[WorkflowNode]` becomes
 * `WorkflowNodeSchema` imported from here, which is the whole point of the
 * feature: one source of truth for the shape, checked at runtime.
 *
 * `RatioSchema` is deliberately narrower than `z.number()` and `TagSchema`
 * narrower than `z.string()`, so a test that parses 5 or 'nope' can tell a real
 * replacement apart from the default scalar it would otherwise emit.
 */
const JSON_TYPES_MODULE = `import * as z from 'zod';

export const WorkflowNodeSchema = z.object({ id: z.string(), label: z.string() });
export const RatioSchema = z.number().min(0).max(1);
export const TagSchema = z.enum(['alpha', 'beta']);
`;

const TYPED_JSON_CONFIG = {
  schemaModule: './json-types',
  schemaSuffix: 'Schema',
  emitNamespace: true,
};

interface GeneratedEnv {
  testDir: string;
  outputDir: string;
  stdout: string;
  stderr: string;
}

async function generate(
  envName: string,
  schemaBody: string,
  extraConfig: Record<string, unknown>,
): Promise<GeneratedEnv> {
  const testEnv = await TestEnvironment.createTestEnv(envName);
  const config = {
    ...ConfigGenerator.createBasicConfig(),
    pureModels: true,
    ...extraConfig,
  };

  const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}
${schemaBody}`;

  writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
  writeFileSync(testEnv.schemaPath, schema);
  const { stdout, stderr } = await testEnv.runGenerationWithOutput();

  return { testDir: testEnv.testDir, outputDir: testEnv.outputDir, stdout, stderr };
}

const schemasDir = (env: GeneratedEnv) => join(env.outputDir, 'schemas');
const objectFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(schemasDir(env), 'objects', `${name}.schema.ts`), 'utf-8');
const modelFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(schemasDir(env), 'models', `${name}.schema.ts`), 'utf-8');

/** The single property line for `fieldName`, whitespace-normalised. */
function fieldLine(content: string, fieldName: string): string {
  const match = content.match(new RegExp(`^\\s*${fieldName}:\\s*(.+?),?\\s*$`, 'm'));
  if (!match) throw new Error(`No line for field "${fieldName}" in:\n${content}`);
  return match[1].replace(/,$/, '').trim();
}

describe('typed JSON: configured', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-on', SCHEMA_BODY, { typedJson: TYPED_JSON_CONFIG });
    // Written after generation so the output-directory cleanup never sees it.
    writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);
  }, GENERATION_TIMEOUT);

  describe('CRUD object schemas', () => {
    it('replaces jsonSchema inside the null-sentinel union, keeping the union and optionality', () => {
      const content = objectFile(env, 'WorkflowCreateInput');

      // Required Json: sentinel enum stays, only the jsonSchema token is replaced.
      expect(fieldLine(content, 'nodes')).toBe(
        'z.union([JsonNullValueInputSchema, WorkflowNodeSchema])',
      );
      // Optional Json: nullable sentinel plus .optional() on the whole union, and
      // deliberately no .nullable() - a raw null is not valid here today.
      expect(fieldLine(content, 'meta')).toBe(
        'z.union([NullableJsonNullValueInputSchema, WorkflowNodeSchema]).optional()',
      );
      expect(fieldLine(content, 'meta')).not.toContain('.nullable()');
    });

    it('leaves unannotated Json fields on the default jsonSchema', () => {
      const content = objectFile(env, 'WorkflowCreateInput');
      expect(fieldLine(content, 'plainJson')).toBe(
        'z.union([JsonNullValueInputSchema, jsonSchema])',
      );
      expect(fieldLine(content, 'plainString')).toBe('z.string()');
    });

    it('treats the annotation as the ELEMENT type on list fields', () => {
      const content = objectFile(env, 'WorkflowCreateInput');
      expect(fieldLine(content, 'steps')).toBe(
        'z.union([z.lazy(() => WorkflowCreatestepsInputObjectSchema), WorkflowNodeSchema.array()]).optional()',
      );
      expect(fieldLine(content, 'tags')).toBe(
        'z.union([z.lazy(() => WorkflowCreatetagsInputObjectSchema), TagSchema.array()]).optional()',
      );
    });

    it('applies both annotation forms to String, Int and Float', () => {
      const content = objectFile(env, 'WorkflowCreateInput');
      expect(fieldLine(content, 'status')).toBe("z.enum(['draft', 'published'])");
      expect(fieldLine(content, 'tier')).toBe(
        'z.union([z.literal(1), z.literal(2), z.literal(3)])',
      );
      expect(fieldLine(content, 'ratio')).toBe('RatioSchema');
    });

    it('emits one deduplicated import per module, naming only the schemas the file uses', () => {
      const content = objectFile(env, 'WorkflowCreateInput');
      const statements = content
        .split('\n')
        .filter((line) => line.includes("from '../json-types'"));

      expect(statements).toHaveLength(1);
      expect(statements[0]).toContain(
        "import { RatioSchema, TagSchema, WorkflowNodeSchema } from '../json-types'",
      );
    });

    it('does not import a schema the file never references', () => {
      // WhereUniqueInput is `id` only, so nothing from the module is used there.
      const content = objectFile(env, 'WorkflowWhereUniqueInput');
      expect(content).not.toContain('json-types');
    });
  });

  describe('filters', () => {
    it('leaves the shared Json and scalar filter objects untyped', () => {
      const jsonFilter = objectFile(env, 'JsonFilter');
      expect(jsonFilter).toContain('jsonSchema');
      expect(jsonFilter).not.toContain('WorkflowNodeSchema');

      const stringFilter = objectFile(env, 'StringFilter');
      expect(stringFilter).not.toContain('draft');

      const intFilter = objectFile(env, 'IntFilter');
      expect(intFilter).not.toContain('z.literal(1)');
    });

    it('keeps ScalarWhereWithAggregatesInput untyped so aggregate comparisons still typecheck', () => {
      const content = objectFile(env, 'WorkflowScalarWhereWithAggregatesInput');
      expect(fieldLine(content, 'status')).toContain('z.string()');
      expect(content).not.toContain('json-types');
    });

    it('types the inline scalar branch of WhereInput, which is the field itself and not a filter', () => {
      const content = objectFile(env, 'WorkflowWhereInput');
      expect(fieldLine(content, 'status')).toBe(
        "z.union([z.lazy(() => StringFilterObjectSchema), z.enum(['draft', 'published'])]).optional()",
      );
      // Json fields reference only the lazy filter, so they are untouched.
      expect(fieldLine(content, 'nodes')).toBe('z.lazy(() => JsonFilterObjectSchema).optional()');
    });
  });

  describe('pure models', () => {
    it('replaces the base schema and still applies the list wrapper', () => {
      const content = modelFile(env, 'Workflow');

      expect(fieldLine(content, 'nodes')).toBe('WorkflowNodeSchema');
      expect(fieldLine(content, 'meta')).toBe('WorkflowNodeSchema.optional()');
      // The `.custom.use` fast-path returns before applyListWrapper; typedJson
      // must sit below it so a list field is still wrapped exactly once.
      expect(fieldLine(content, 'steps')).toBe('z.array(WorkflowNodeSchema)');
      expect(fieldLine(content, 'tags')).toBe('z.array(TagSchema)');
    });

    it('applies the scalar annotations and leaves unannotated fields alone', () => {
      const content = modelFile(env, 'Workflow');
      expect(fieldLine(content, 'status')).toBe("z.enum(['draft', 'published'])");
      expect(fieldLine(content, 'ratio')).toBe('RatioSchema');
      expect(fieldLine(content, 'plainString')).toBe('z.string()');
      expect(fieldLine(content, 'plainJson')).toContain('z.unknown()');
    });

    it('imports from the module once, resolved relative to the models directory', () => {
      const content = modelFile(env, 'Workflow');
      const statements = content
        .split('\n')
        .filter((line) => line.includes("from '../json-types'"));

      expect(statements).toHaveLength(1);
      expect(statements[0]).toContain(
        "import { RatioSchema, TagSchema, WorkflowNodeSchema } from '../json-types'",
      );
    });
  });

  describe('emitNamespace', () => {
    it('writes the declare-global file with every annotated type', () => {
      const nsPath = join(schemasDir(env), 'prisma-json-types.d.ts');
      expect(existsSync(nsPath)).toBe(true);

      const content = readFileSync(nsPath, 'utf-8');
      expect(content).toContain('namespace PrismaJson');
      expect(content).toContain('type WorkflowNode');
      expect(content).toContain('type Ratio');
      expect(content).toContain('type Tag');
    });
  });

  describe('the emitted schemas actually validate', () => {
    const valid = {
      nodes: { id: 'n1', label: 'start' },
      plainJson: { anything: true },
      status: 'draft',
      tier: 2,
      ratio: 0.5,
      plainString: 'x',
    };

    async function createInput() {
      const mod = await import(join(schemasDir(env), 'objects', 'WorkflowCreateInput.schema.ts'));
      return mod.WorkflowCreateInputObjectZodSchema as {
        parse: (value: unknown) => unknown;
      };
    }

    it('accepts a conforming create input', async () => {
      const schema = await createInput();
      expect(() => schema.parse(valid)).not.toThrow();
      expect(() =>
        schema.parse({ ...valid, steps: [{ id: 'a', label: 'b' }], tags: ['alpha'] }),
      ).not.toThrow();
    });

    it('rejects values the annotation excludes', async () => {
      const schema = await createInput();
      expect(() => schema.parse({ ...valid, nodes: { id: 1, label: 'x' } })).toThrow();
      expect(() => schema.parse({ ...valid, status: 'archived' })).toThrow();
      expect(() => schema.parse({ ...valid, tier: 4 })).toThrow();
      // RatioSchema is z.number().min(0).max(1); plain z.number() would accept 5.
      expect(() => schema.parse({ ...valid, ratio: 5 })).toThrow();
      expect(() => schema.parse({ ...valid, steps: [{ id: 1 }] })).toThrow();
      expect(() => schema.parse({ ...valid, tags: ['nope'] })).toThrow();
    });

    it('validates the pure model, element schemas included', async () => {
      const mod = await import(join(schemasDir(env), 'models', 'Workflow.schema.ts'));
      const schema = mod.WorkflowSchema as { parse: (value: unknown) => unknown };

      const model = {
        id: 1,
        nodes: { id: 'n1', label: 'start' },
        steps: [{ id: 'a', label: 'b' }],
        plainJson: {},
        status: 'published',
        tier: 3,
        ratio: 1,
        tags: ['beta'],
        plainString: 'x',
      };

      expect(() => schema.parse(model)).not.toThrow();
      expect(() => schema.parse({ ...model, steps: [{ id: 'a' }] })).toThrow();
      expect(() => schema.parse({ ...model, tags: ['nope'] })).toThrow();
    });
  });
});

describe('typed JSON: unconfigured', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-off', SCHEMA_BODY, {});
  }, GENERATION_TIMEOUT);

  it('emits exactly what 3.0.0 emitted, annotations present or not', () => {
    const content = objectFile(env, 'WorkflowCreateInput');

    expect(fieldLine(content, 'nodes')).toBe('z.union([JsonNullValueInputSchema, jsonSchema])');
    expect(fieldLine(content, 'meta')).toBe(
      'z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional()',
    );
    expect(fieldLine(content, 'status')).toBe('z.string()');
    expect(fieldLine(content, 'tier')).toBe('z.number().int()');
    expect(fieldLine(content, 'ratio')).toBe('z.number()');
    expect(content).not.toContain('json-types');

    const model = modelFile(env, 'Workflow');
    expect(fieldLine(model, 'status')).toBe('z.string()');
    expect(model).not.toContain('json-types');
  });

  it('writes no namespace file', () => {
    expect(existsSync(join(schemasDir(env), 'prisma-json-types.d.ts'))).toBe(false);
  });

  it('warns that the annotations were seen and ignored, and does not fail', () => {
    const output = `${env.stdout}\n${env.stderr}`;
    expect(output).toMatch(/typedJson/);
    expect(output).toMatch(/Workflow\.(nodes|status)/);
  });
});

describe('typed JSON: hazards', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    const body = `
model Workflow {
  id Int @id @default(autoincrement())

  /// !['A' | 'B']
  code String @db.VarChar(8)

  /// ![string]
  note String @db.VarChar(16)

  plain String @db.VarChar(32)

  /// [Tag]
  set String

  /// [Tag]
  tags String[]

  ManyThings String[]
}
`;
    env = await generate('typed-json-hazards', body, {
      typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' },
    });
    writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);
  }, GENERATION_TIMEOUT);

  it('does not append a native @db.VarChar max to a replacement that cannot take one', () => {
    const content = objectFile(env, 'WorkflowCreateInput');
    // z.enum([...]).max(8) is valid TypeScript and throws TypeError on import.
    expect(fieldLine(content, 'code')).toBe("z.enum(['A', 'B'])");
  });

  it('still appends it when the replacement is a plain z.string(), and when there is none', () => {
    const content = objectFile(env, 'WorkflowCreateInput');
    expect(fieldLine(content, 'note')).toBe('z.string().max(16)');
    expect(fieldLine(content, 'plain')).toBe('z.string().max(32)');
  });

  it('loads the emitted module, which .max() on a non-string would prevent', async () => {
    const mod = await import(join(schemasDir(env), 'objects', 'WorkflowCreateInput.schema.ts'));
    const schema = mod.WorkflowCreateInputObjectZodSchema as {
      parse: (value: unknown) => unknown;
    };
    const valid = { code: 'A', note: 'hello', plain: 'x', set: 'alpha' };

    expect(() => schema.parse(valid)).not.toThrow();
    expect(() => schema.parse({ ...valid, code: 'C' })).toThrow();
    expect(() => schema.parse({ ...valid, note: 'x'.repeat(17) })).toThrow();
  });

  it('leaves the ordinary {set} / {push} list wrappers untyped', () => {
    // An accepted limitation: these files are named `<Model>Create<field>Input` and their
    // members are `set` and `push`, so there is no model field to look an annotation up by.
    const content = objectFile(env, 'WorkflowCreatetagsInput');
    expect(fieldLine(content, 'set')).toBe('z.string().array()');
    expect(content).not.toContain('TagSchema');
  });

  it('does not leak a field annotation into a list wrapper whose name collides with a model pattern', () => {
    // `ManyThings` is a legal Prisma field name, and it makes the wrapper
    // `WorkflowCreateManyThingsInput` - which the model-name patterns DO match, resolving
    // to `Workflow`. Its member `set` then finds this model's real `set` field, whose
    // annotation belongs to a completely different column.
    const content = objectFile(env, 'WorkflowCreateManyThingsInput');
    expect(fieldLine(content, 'set')).toBe('z.string().array()');
    expect(content).not.toContain('TagSchema');
  });
});

describe('typed JSON: single-file mode', () => {
  /**
   * Every schema collapses into one bundle here, so the per-directory rewrite that makes
   * `./json-types` correct from `objects/` would make it wrong from the bundle. What
   * matters is where the bundle lands, not which directory the content came from.
   */
  it(
    'resolves the module against the bundle, not the directory the schema came from',
    async () => {
      const env = await generate('typed-json-single-file', SCHEMA_BODY, {
        typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' },
        useMultipleFiles: false,
        variants: {
          pure: { enabled: false },
          input: { enabled: false },
          result: { enabled: false },
        },
      });

      // placeSingleFileAtRoot defaults to true, so the bundle sits at the generator output
      // root and the specifier must stay exactly as configured.
      const bundle = readFileSync(join(schemasDir(env), 'schemas.ts'), 'utf-8');

      expect(bundle).toContain("from './json-types'");
      expect(bundle).not.toContain("from '../json-types'");
      expect(bundle).toContain('WorkflowNodeSchema');

      // Every name must be imported exactly once. Merged per-file statements differ between
      // files, survive the bundle's text de-duplication, and land as duplicate identifiers.
      for (const name of ['WorkflowNodeSchema', 'RatioSchema', 'TagSchema']) {
        const importsOfName = bundle
          .split('\n')
          .filter((line) => line.startsWith('import') && new RegExp(`\\b${name}\\b`).test(line));
        expect(importsOfName).toHaveLength(1);
      }
    },
    GENERATION_TIMEOUT,
  );
});

describe('typed JSON: unresolvable annotations', () => {
  /**
   * With `schemaModule` set every `[Name]` resolves by convention, so the only way a name
   * has nowhere to go is a `map`-only config with no entry for it. That is the case that
   * must fall back rather than emit a reference to a schema nobody exports.
   */
  it(
    'keeps the current schema and says why, instead of guessing',
    async () => {
      const body = `
model Workflow {
  id Int @id @default(autoincrement())

  /// [Known]
  known Json

  /// [Missing]
  orphan Json

  /// ![() => void]
  weird String
}
`;
      const env = await generate('typed-json-unresolvable', body, {
        typedJson: { map: { Known: 'z.object({ ok: z.boolean() })' } },
      });
      const content = objectFile(env, 'WorkflowCreateInput');

      expect(fieldLine(content, 'known')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ ok: z.boolean() })])',
      );
      expect(fieldLine(content, 'orphan')).toBe('z.union([JsonNullValueInputSchema, jsonSchema])');
      expect(fieldLine(content, 'weird')).toBe('z.string()');

      const output = `${env.stdout}\n${env.stderr}`;
      expect(output).toContain('Workflow.orphan');
      expect(output).toContain('Workflow.weird');
      expect(output).toMatch(/keeps its current schema/);
    },
    GENERATION_TIMEOUT,
  );
});

describe('typed JSON: precedence', () => {
  it(
    'lets @zod.custom.use win when a field carries both',
    async () => {
      const body = `
model Workflow {
  id Int @id @default(autoincrement())

  /// [WorkflowNode]
  /// @zod.import(["import { OverrideSchema } from 'workflow-overrides'"]).custom.use(OverrideSchema)
  both Json

  /// [WorkflowNode]
  onlyPjtg Json
}
`;
      const env = await generate('typed-json-precedence', body, { typedJson: TYPED_JSON_CONFIG });
      const content = objectFile(env, 'WorkflowCreateInput');

      expect(fieldLine(content, 'both')).toBe(
        'z.union([JsonNullValueInputSchema, OverrideSchema])',
      );
      expect(content).toContain("import { OverrideSchema } from 'workflow-overrides'");
      // The other field still resolves through typedJson.
      expect(fieldLine(content, 'onlyPjtg')).toBe(
        'z.union([JsonNullValueInputSchema, WorkflowNodeSchema])',
      );

      const model = modelFile(env, 'Workflow');
      expect(fieldLine(model, 'both')).toBe('OverrideSchema');
      expect(fieldLine(model, 'onlyPjtg')).toBe('WorkflowNodeSchema');
    },
    GENERATION_TIMEOUT,
  );
});
