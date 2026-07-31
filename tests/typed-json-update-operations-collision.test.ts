import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * The per-field update-operations copy is named `<Model><Field>FieldUpdateOperationsInput`,
 * and two different columns can produce the same name: `Collide.labelField` and
 * `CollideLabel.field` both yield `CollideLabelFieldFieldUpdateOperationsInput`.
 *
 * This file pins what happens then. It deliberately does *not* assert that the collision
 * is resolved, because it is not: the first claimant keeps the name and the second column
 * stays on the shared schema, so its `{ set: ... }` form is unconstrained. That is the
 * project's "leave it alone when uncertain" default and it is warned about at generation
 * time.
 *
 * What has to hold is the bound on the damage, and that is what is asserted here:
 *
 *   - the copy carries the *winner's* annotation and nothing of the loser's, so one
 *     column's type is never enforced on another column;
 *   - the loser keeps its annotation on the direct arm, so `{ field: <bad> }` is still
 *     rejected and only the `{ set: <bad> }` route is open;
 *   - the shared `StringFieldUpdateOperationsInput` is untouched for everyone else.
 *
 * A silent hole is worse than a loud one. If the naming scheme is ever changed to
 * disambiguate, these assertions are the ones that should go red.
 */

const SCHEMA_BODY = `
model Collide {
  id Int @id @default(autoincrement())

  /// [Tag]
  labelField String
}

model CollideLabel {
  id Int @id @default(autoincrement())

  /// [Ratio]
  field String
}

model Control {
  id Int @id @default(autoincrement())

  /// [Tag]
  label String

  plain String
}
`;

const JSON_TYPES_MODULE = `import * as z from 'zod';

export const TagSchema = z.enum(['alpha', 'beta']);
export const RatioSchema = z.number().min(0).max(1);
`;

interface GeneratedEnv {
  outputDir: string;
}

async function generate(envName: string): Promise<GeneratedEnv> {
  const testEnv = await TestEnvironment.createTestEnv(envName);
  const config = {
    ...ConfigGenerator.createBasicConfig(),
    typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' },
  };

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

  await testEnv.runGeneration();
  return { outputDir: testEnv.outputDir };
}

const schemasDir = (env: GeneratedEnv) => join(env.outputDir, 'schemas');
const objectFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(schemasDir(env), 'objects', `${name}.schema.ts`), 'utf-8');

type Parser = { parse: (value: unknown) => unknown };

async function updateOne(env: GeneratedEnv, model: string, exportName: string): Promise<Parser> {
  const mod = await import(join(schemasDir(env), `updateOne${model}.schema.ts`));
  return mod[exportName] as Parser;
}

const COLLIDED = 'CollideLabelFieldFieldUpdateOperationsInput';

describe('typed JSON: two columns that want the same update-operations name', () => {
  let env: GeneratedEnv;
  let collide: Parser;
  let collideLabel: Parser;
  let control: Parser;

  beforeAll(async () => {
    env = await generate('typed-json-update-ops-collision');
    // Written after generation so the output-directory cleanup never sees it.
    writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);
    collide = await updateOne(env, 'Collide', 'CollideUpdateOneZodSchema');
    collideLabel = await updateOne(env, 'CollideLabel', 'CollideLabelUpdateOneZodSchema');
    control = await updateOne(env, 'Control', 'ControlUpdateOneZodSchema');
  }, GENERATION_TIMEOUT);

  it('gives the contested name to exactly one column and leaves the other on the shared schema', () => {
    expect(objectFile(env, 'CollideUpdateInput')).toContain(`${COLLIDED}ObjectSchema`);
    expect(objectFile(env, 'CollideLabelUpdateInput')).toContain(
      'StringFieldUpdateOperationsInputObjectSchema',
    );
    expect(objectFile(env, 'CollideLabelUpdateInput')).not.toContain(COLLIDED);
  });

  it('never puts the annotation of one column onto the other column', () => {
    const copy = objectFile(env, COLLIDED);
    expect(copy).toContain('TagSchema');
    expect(copy).not.toContain('RatioSchema');
  });

  it('leaves the shared schema untyped for every other column', () => {
    const shared = objectFile(env, 'StringFieldUpdateOperationsInput');
    expect(shared).toContain('set: z.string().optional()');
    expect(shared).not.toContain('TagSchema');
    expect(shared).not.toContain('RatioSchema');
  });

  it('closes the set route for the column that won the name', () => {
    expect(() =>
      collide.parse({ where: { id: 1 }, data: { labelField: { set: 'nope' } } }),
    ).toThrow();
    expect(() =>
      collide.parse({ where: { id: 1 }, data: { labelField: { set: 'alpha' } } }),
    ).not.toThrow();
  });

  it('leaves the set route open for the column that lost it, and says so', () => {
    // The hole. Pinned rather than hidden: this is what the generation-time warning
    // is about, and it is the assertion that should go red if the naming is fixed.
    expect(() =>
      collideLabel.parse({ where: { id: 1 }, data: { field: { set: 'anything at all' } } }),
    ).not.toThrow();
  });

  it('still enforces the annotation of the losing column on the direct arm', () => {
    expect(() => collideLabel.parse({ where: { id: 1 }, data: { field: 0.5 } })).not.toThrow();
    expect(() => collideLabel.parse({ where: { id: 1 }, data: { field: 4.2 } })).toThrow();
    expect(() => collideLabel.parse({ where: { id: 1 }, data: { field: 'nope' } })).toThrow();
  });

  it('does not disturb an uncontested annotated column, or its unannotated neighbour', () => {
    expect(() => control.parse({ where: { id: 1 }, data: { label: { set: 'nope' } } })).toThrow();
    expect(() =>
      control.parse({ where: { id: 1 }, data: { label: { set: 'alpha' } } }),
    ).not.toThrow();
    expect(() =>
      control.parse({ where: { id: 1 }, data: { plain: { set: 'anything at all' } } }),
    ).not.toThrow();
  });
});
