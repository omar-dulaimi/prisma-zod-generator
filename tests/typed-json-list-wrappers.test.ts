import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Typed JSON in the `{ set }` / `{ push }` list-operation wrappers.
 *
 * `{ set: [...] }` and `{ push: ... }` are how a list column is written through
 * Prisma, so `<Model><Create|Update><field>Input` is on the path users hit rather
 * than an edge case. The outer field already carries the annotation; these files
 * are the object it points at.
 *
 * Two things are being pinned here, and the second one is the important one:
 *
 * 1. an annotated list field types both members of its wrapper;
 * 2. every other wrapper is untouched. These files exist for every list field of
 *    every scalar type, and an unannotated `tags String[]` has always emitted
 *    `set: z.string().array()`. It has to keep doing exactly that, annotation
 *    present elsewhere in the model or not, and with no `typedJson` block at all.
 */

const SCHEMA_BODY = `
model Workflow {
  id Int @id @default(autoincrement())

  /// [Node]
  steps Json[]

  plainJson Json[]

  /// [Tag]
  tags String[]

  labels String[]

  /// ![1 | 2]
  tiers Int[]

  counts Int[]

  /// [Ratio]
  ratios Float[]

  /// [Node]
  node Json

  capped String[] @db.VarChar(8)
}

model Collide {
  id Int @id @default(autoincrement())

  /// [Tag]
  set String

  /// [Tag]
  tags String[]

  ManyThings String[]
}
`;

/**
 * The hand-authored module the annotations resolve against. Each schema is
 * deliberately narrower than the scalar it replaces, so a test that parses
 * 'nope' or 9 can tell a real replacement from the default.
 */
const JSON_TYPES_MODULE = `import * as z from 'zod';

export const NodeSchema = z.object({ id: z.string(), label: z.string() });
export const TagSchema = z.enum(['alpha', 'beta']);
export const RatioSchema = z.number().min(0).max(1);
`;

interface GeneratedEnv {
  outputDir: string;
  stdout: string;
  stderr: string;
}

async function generate(
  envName: string,
  extraConfig: Record<string, unknown>,
): Promise<GeneratedEnv> {
  const testEnv = await TestEnvironment.createTestEnv(envName);
  const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true, ...extraConfig };

  writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
  writeFileSync(
    testEnv.schemaPath,
    `
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
${SCHEMA_BODY}`,
  );

  const { stdout, stderr } = await testEnv.runGenerationWithOutput();
  return { outputDir: testEnv.outputDir, stdout, stderr };
}

const schemasDir = (env: GeneratedEnv) => join(env.outputDir, 'schemas');
const objectFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(schemasDir(env), 'objects', `${name}.schema.ts`), 'utf-8');

/** The single property line for `member`, whitespace-normalised. */
function memberLine(content: string, member: string): string {
  const match = content.match(new RegExp(`^\\s*${member}:\\s*(.+?),?\\s*$`, 'm'));
  if (!match) throw new Error(`No line for "${member}" in:\n${content}`);
  return match[1].replace(/,$/, '').trim();
}

async function zodSchema(env: GeneratedEnv, name: string) {
  const mod = await import(join(schemasDir(env), 'objects', `${name}.schema.ts`));
  return mod[`${name}ObjectZodSchema`] as { parse: (value: unknown) => unknown };
}

/* -------------------------------------------------------------------------- */

describe('typed JSON: list-operation wrappers, configured', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-list-wrappers-on', {
      typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' },
    });
    // Written after generation so the output-directory cleanup never sees it.
    writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);
  }, GENERATION_TIMEOUT);

  describe('the annotated field', () => {
    it('types set in the create wrapper', () => {
      expect(memberLine(objectFile(env, 'WorkflowCreatestepsInput'), 'set')).toBe(
        'NodeSchema.array()',
      );
    });

    it('types set and push in the update wrapper', () => {
      const content = objectFile(env, 'WorkflowUpdatestepsInput');
      expect(memberLine(content, 'set')).toBe('NodeSchema.array().optional()');
      expect(memberLine(content, 'push')).toBe(
        'z.union([NodeSchema, NodeSchema.array()]).optional()',
      );
    });

    it('imports the module it now references, and drops the json helper it no longer does', () => {
      const content = objectFile(env, 'WorkflowUpdatestepsInput');
      expect(content).toContain("import { NodeSchema } from '../json-types'");
      expect(content).not.toContain('json-helpers');
      expect(content).not.toContain('jsonSchema');
    });

    it('applies to String, Int and Float list wrappers, both annotation forms', () => {
      expect(memberLine(objectFile(env, 'WorkflowCreatetagsInput'), 'set')).toBe(
        'TagSchema.array()',
      );
      expect(memberLine(objectFile(env, 'WorkflowUpdatetagsInput'), 'push')).toBe(
        'z.union([TagSchema, TagSchema.array()]).optional()',
      );
      expect(memberLine(objectFile(env, 'WorkflowCreatetiersInput'), 'set')).toBe(
        'z.union([z.literal(1), z.literal(2)]).array()',
      );
      expect(memberLine(objectFile(env, 'WorkflowCreateratiosInput'), 'set')).toBe(
        'RatioSchema.array()',
      );
    });
  });

  describe('inertness, with typedJson configured', () => {
    it('leaves an unannotated String[] wrapper exactly as it was', () => {
      const create = objectFile(env, 'WorkflowCreatelabelsInput');
      expect(memberLine(create, 'set')).toBe('z.string().array()');
      expect(create).not.toContain('json-types');

      const update = objectFile(env, 'WorkflowUpdatelabelsInput');
      expect(memberLine(update, 'set')).toBe('z.string().array().optional()');
      expect(memberLine(update, 'push')).toBe(
        'z.union([z.string(), z.string().array()]).optional()',
      );
      expect(update).not.toContain('json-types');
    });

    it('leaves an unannotated Json[] wrapper on the json helper', () => {
      const content = objectFile(env, 'WorkflowUpdateplainJsonInput');
      expect(memberLine(content, 'set')).toBe('jsonSchema.array().optional()');
      expect(memberLine(content, 'push')).toBe(
        'z.union([jsonSchema, jsonSchema.array()]).optional()',
      );
      expect(content).not.toContain('json-types');
    });

    it('leaves an unannotated Int[] wrapper alone', () => {
      expect(memberLine(objectFile(env, 'WorkflowCreatecountsInput'), 'set')).toBe(
        'z.number().int().array()',
      );
    });

    it('does not invent a wrapper member out of a scalar annotation', () => {
      // `node Json` is annotated but not a list, so Prisma emits no wrapper for it.
      const objects = objectFile(env, 'WorkflowCreateInput');
      expect(objects).not.toContain('WorkflowCreatenodeInput');
    });
  });

  describe('the wrapper takes its annotation from the field it wraps, never from a member name', () => {
    /**
     * `Collide` has a column literally called `set` carrying `[Tag]`, and an
     * unannotated `ManyThings String[]`. A lookup keyed on the member name finds
     * that column from inside every wrapper in the model and stamps an unrelated
     * annotation onto it. `ManyThings` is the sharp version: its wrapper is
     * `CollideCreateManyThingsInput`, which the model-name patterns DO match.
     */
    it('does not leak the set column annotation into an unannotated wrapper', () => {
      const content = objectFile(env, 'CollideCreateManyThingsInput');
      expect(memberLine(content, 'set')).toBe('z.string().array()');
      expect(content).not.toContain('TagSchema');
    });

    it('still types the wrapper of the annotated list field in the same model', () => {
      expect(memberLine(objectFile(env, 'CollideCreatetagsInput'), 'set')).toBe(
        'TagSchema.array()',
      );
    });
  });

  describe('the emitted wrappers actually validate', () => {
    it('accepts and rejects through set on the create wrapper', async () => {
      const schema = await zodSchema(env, 'WorkflowCreatestepsInput');
      expect(() => schema.parse({ set: [{ id: 'a', label: 'b' }] })).not.toThrow();
      expect(() => schema.parse({ set: [] })).not.toThrow();
      expect(() => schema.parse({ set: [{ id: 1, label: 'b' }] })).toThrow();
      expect(() => schema.parse({ set: ['nope'] })).toThrow();
    });

    it('accepts and rejects through set and push on the update wrapper', async () => {
      const schema = await zodSchema(env, 'WorkflowUpdatestepsInput');
      expect(() => schema.parse({ set: [{ id: 'a', label: 'b' }] })).not.toThrow();
      expect(() => schema.parse({ push: { id: 'a', label: 'b' } })).not.toThrow();
      expect(() => schema.parse({ push: [{ id: 'a', label: 'b' }] })).not.toThrow();
      expect(() => schema.parse({ push: [] })).not.toThrow();

      expect(() => schema.parse({ set: ['nope'] })).toThrow();
      expect(() => schema.parse({ push: 'nope' })).toThrow();
      expect(() => schema.parse({ push: ['nope'] })).toThrow();
    });

    it('validates a scalar list wrapper the same way', async () => {
      const schema = await zodSchema(env, 'WorkflowUpdatetagsInput');
      expect(() => schema.parse({ set: ['alpha', 'beta'] })).not.toThrow();
      expect(() => schema.parse({ push: 'alpha' })).not.toThrow();
      expect(() => schema.parse({ set: ['nope'] })).toThrow();
      expect(() => schema.parse({ push: 'nope' })).toThrow();
    });

    it('leaves an unannotated wrapper accepting whatever it accepted before', async () => {
      const schema = await zodSchema(env, 'WorkflowUpdatelabelsInput');
      expect(() => schema.parse({ set: ['anything', 'at', 'all'] })).not.toThrow();
      expect(() => schema.parse({ push: 'nope' })).not.toThrow();
      expect(() => schema.parse({ set: [1] })).toThrow();
    });

    it('reaches the wrapper through the outer field, which is how Prisma is written', async () => {
      const schema = await zodSchema(env, 'WorkflowUpdateInput');
      expect(() => schema.parse({ steps: { set: [{ id: 'a', label: 'b' }] } })).not.toThrow();
      expect(() => schema.parse({ steps: { push: { id: 'a', label: 'b' } } })).not.toThrow();
      expect(() => schema.parse({ steps: { set: ['nope'] } })).toThrow();
      expect(() => schema.parse({ tags: { set: ['nope'] } })).toThrow();
      expect(() => schema.parse({ tags: { set: ['alpha'] } })).not.toThrow();
      // Unannotated neighbours keep taking anything their scalar type allows.
      expect(() => schema.parse({ labels: { set: ['nope'] } })).not.toThrow();
    });
  });
});

/* -------------------------------------------------------------------------- */

describe('typed JSON: list-operation wrappers, unconfigured', () => {
  /**
   * The regression contract. The same annotated schema, no `typedJson` block:
   * every wrapper must emit exactly what 3.0.0 emitted.
   */
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-list-wrappers-off', {});
  }, GENERATION_TIMEOUT);

  it('emits the 3.0.0 wrapper for every list field, annotated or not', () => {
    expect(memberLine(objectFile(env, 'WorkflowCreatestepsInput'), 'set')).toBe(
      'jsonSchema.array()',
    );

    const steps = objectFile(env, 'WorkflowUpdatestepsInput');
    expect(memberLine(steps, 'set')).toBe('jsonSchema.array().optional()');
    expect(memberLine(steps, 'push')).toBe('z.union([jsonSchema, jsonSchema.array()]).optional()');

    expect(memberLine(objectFile(env, 'WorkflowCreatetagsInput'), 'set')).toBe(
      'z.string().array()',
    );
    expect(memberLine(objectFile(env, 'WorkflowCreatetiersInput'), 'set')).toBe(
      'z.number().int().array()',
    );
    expect(memberLine(objectFile(env, 'WorkflowCreateratiosInput'), 'set')).toBe(
      'z.number().array()',
    );
    expect(memberLine(objectFile(env, 'CollideCreateManyThingsInput'), 'set')).toBe(
      'z.string().array()',
    );
  });

  it('references no schema module from any wrapper', () => {
    for (const name of [
      'WorkflowCreatestepsInput',
      'WorkflowUpdatestepsInput',
      'WorkflowCreatetagsInput',
      'WorkflowUpdatetagsInput',
      'CollideCreatetagsInput',
    ]) {
      expect(objectFile(env, name)).not.toContain('json-types');
    }
  });
});
