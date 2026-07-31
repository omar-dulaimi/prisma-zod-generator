import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveTypedJsonConfig, resolveTypedJsonType } from '../src/config/typed-json';
import {
  buildTypedJsonNamespace,
  writeTypedJsonNamespace,
  type TypedJsonNamespaceBinding,
} from '../src/generators/typed-json-namespace';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

const REPO_ROOT = join(__dirname, '..');

const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Scratch directory under the repo so `zod` resolves from the repo's node_modules. */
function scratch(label: string): string {
  const root = join(REPO_ROOT, `test-env-typedjson-ns-${label}-${process.pid}`);
  roots.push(root);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  return root;
}

function configOf(overrides: Record<string, unknown> = {}) {
  return resolveTypedJsonConfig({
    typedJson: { schemaModule: './json-types', emitNamespace: true, ...overrides },
  })!;
}

function bindingOf(
  typeName: string,
  model: string,
  field: string,
  config = configOf(),
): TypedJsonNamespaceBinding {
  return { typeName, model, field, resolution: resolveTypedJsonType(typeName, config) };
}

/**
 * Section 4 of the design. The point of the emitted namespace is to delete the second
 * source of truth: the Zod schema is authored, the TypeScript type is derived from it.
 *
 * A namespace that does not compile is worse than none, so the compile checks below are
 * the load-bearing ones - text assertions cannot tell you that `z.infer<typeof X>`
 * resolves, and they certainly cannot tell you the resulting type is enforced.
 */
describe('typedJson namespace emitter', () => {
  describe('nothing to declare', () => {
    it('produces no content when there are no annotated fields', () => {
      const result = buildTypedJsonNamespace({
        bindings: [],
        config: configOf(),
        baseDir: '/out',
      });
      expect(result.content).toBeNull();
      expect(result.declared).toEqual([]);
    });

    it('writes no file at all rather than an empty one', async () => {
      const root = scratch('empty');
      const written = await writeTypedJsonNamespace({
        bindings: [],
        config: configOf(),
        baseDir: root,
      });
      expect(written.filePath).toBeNull();
      expect(existsSync(join(root, 'prisma-json-types.d.ts'))).toBe(false);
    });

    it('writes nothing when emitNamespace is off, even with bindings', async () => {
      const root = scratch('disabled');
      const config = configOf({ emitNamespace: false });
      const written = await writeTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
        config,
        baseDir: root,
      });
      expect(written.filePath).toBeNull();
      expect(existsSync(join(root, 'prisma-json-types.d.ts'))).toBe(false);
    });
  });

  describe('shape', () => {
    it('emits the declare global block from the design', () => {
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes')],
        config: configOf(),
        baseDir: '/out',
      });
      expect(result.content).toContain("import type { z } from 'zod';");
      expect(result.content).toContain("import type { WorkflowNodeSchema } from './json-types';");
      expect(result.content).toContain('declare global {');
      expect(result.content).toContain('namespace PrismaJson {');
      expect(result.content).toContain('type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;');
      expect(result.content).toContain('export {};');
      expect(result.declared).toEqual(['WorkflowNode']);
      expect(result.warnings).toEqual([]);
    });

    it('honours a custom namespace name', () => {
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes')],
        config: configOf({ namespace: 'AppJson' }),
        baseDir: '/out',
      });
      expect(result.content).toContain('namespace AppJson {');
    });

    it('merges imports from one module and orders declarations deterministically', () => {
      const result = buildTypedJsonNamespace({
        bindings: [
          bindingOf('Zeta', 'B', 'z'),
          bindingOf('Alpha', 'A', 'a'),
          bindingOf('Mid', 'C', 'm'),
        ],
        config: configOf(),
        baseDir: '/out',
      });
      expect(result.content).toContain(
        "import type { AlphaSchema, MidSchema, ZetaSchema } from './json-types';",
      );
      expect(result.declared).toEqual(['Alpha', 'Mid', 'Zeta']);
    });

    it('carries the originating model.field so the declaration is traceable', () => {
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes')],
        config: configOf(),
        baseDir: '/out',
      });
      expect(result.content).toContain('Workflow.nodes');
    });
  });

  describe('the same type name on two models', () => {
    it('declares it once when both resolve the same way, with no warning', () => {
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('Config', 'Order', 'config'), bindingOf('Config', 'User', 'config')],
        config: configOf(),
        baseDir: '/out',
      });
      const occurrences = (result.content ?? '').match(/type Config =/g) ?? [];
      expect(occurrences).toHaveLength(1);
      expect(result.warnings).toEqual([]);
      expect(result.content).toContain('Order.config');
      expect(result.content).toContain('User.config');
    });

    it('reports the clash when they resolve differently, and still declares it once', () => {
      const bindings: TypedJsonNamespaceBinding[] = [
        bindingOf('Config', 'Order', 'config'),
        {
          typeName: 'Config',
          model: 'User',
          field: 'config',
          resolution: {
            kind: 'module',
            importName: 'UserConfigSchema',
            module: './other-types',
            expression: 'UserConfigSchema',
          },
        },
      ];
      const result = buildTypedJsonNamespace({ bindings, config: configOf(), baseDir: '/out' });

      const occurrences = (result.content ?? '').match(/type Config =/g) ?? [];
      expect(occurrences).toHaveLength(1);

      const joined = result.warnings.join('\n');
      expect(joined).toMatch(/Config/);
      expect(joined).toMatch(/Order\.config/);
      expect(joined).toMatch(/User\.config/);
      expect(result.conflicts.map((c) => c.typeName)).toEqual(['Config']);
    });
  });

  describe('types it cannot derive', () => {
    it('skips an unresolved type name instead of emitting a broken reference', () => {
      const config = resolveTypedJsonConfig({ typedJson: { emitNamespace: true } })!;
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
        config,
        baseDir: '/out',
      });
      expect(result.content).toBeNull();
      expect(result.skipped.map((s) => s.typeName)).toEqual(['WorkflowNode']);
      expect(result.warnings.join('\n')).toMatch(/WorkflowNode/);
    });

    it('skips a map override, which has no importable binding to derive from', () => {
      const config = configOf({ map: { Weird: 'z.custom<unknown>()' } });
      const result = buildTypedJsonNamespace({
        bindings: [
          bindingOf('Weird', 'Thing', 'weird', config),
          bindingOf('WorkflowNode', 'Workflow', 'nodes', config),
        ],
        config,
        baseDir: '/out',
      });
      expect(result.declared).toEqual(['WorkflowNode']);
      expect(result.skipped.map((s) => s.typeName)).toEqual(['Weird']);
      expect(result.content).not.toContain('Weird');
    });
  });

  describe('paths', () => {
    it('rewrites a relative schemaModule for the namespace file location', () => {
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes')],
        config: configOf({ namespaceOutput: './types/nested/prisma-json.d.ts' }),
        baseDir: '/out',
      });
      expect(result.content).toContain(
        "import type { WorkflowNodeSchema } from '../../json-types';",
      );
    });

    it('leaves a package specifier alone', () => {
      const config = configOf({
        schemaModule: '@acme/json-types',
        namespaceOutput: './types/prisma-json.d.ts',
      });
      const result = buildTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
        config,
        baseDir: '/out',
      });
      expect(result.content).toContain(
        "import type { WorkflowNodeSchema } from '@acme/json-types';",
      );
    });

    it('creates the directory a nested namespaceOutput needs', async () => {
      const root = scratch('nested');
      const config = configOf({ namespaceOutput: './types/generated/prisma-json.d.ts' });
      const written = await writeTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
        config,
        baseDir: root,
      });
      const expected = join(root, 'types', 'generated', 'prisma-json.d.ts');
      expect(written.filePath).toBe(expected);
      expect(existsSync(expected)).toBe(true);
      expect(readFileSync(expected, 'utf-8')).toContain('namespace PrismaJson');
    });
  });

  /**
   * `namespaceOutput` is the one path in this generator that is expected to point
   * *outside* the output directory - the whole point is to put the declaration
   * somewhere the consumer's tsconfig already includes, which is usually `src/`. So it
   * can be aimed, by typo, at a hand-written file, and nothing else in the pipeline is
   * watching that path.
   */
  describe('overwriting', () => {
    it('replaces its own previous output without complaint', async () => {
      const root = scratch('rewrite');
      const config = configOf();
      const first = await writeTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
        config,
        baseDir: root,
      });
      const second = await writeTypedJsonNamespace({
        bindings: [bindingOf('Priority', 'Workflow', 'priority', config)],
        config,
        baseDir: root,
      });
      expect(second.filePath).toBe(first.filePath);
      expect(second.refusedPath).toBeNull();
      expect(second.warnings).toEqual([]);
      const content = readFileSync(second.filePath!, 'utf-8');
      expect(content).toContain('type Priority =');
      expect(content).not.toContain('type WorkflowNode =');
    });

    it('refuses to clobber a file it did not write, and says so', async () => {
      const root = scratch('handwritten');
      const target = join(root, 'prisma-json-types.d.ts');
      const handWritten = 'export type KeepMe = { mine: true };\n';
      writeFileSync(target, handWritten);

      const config = configOf();
      const written = await writeTypedJsonNamespace({
        bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
        config,
        baseDir: root,
      });

      expect(readFileSync(target, 'utf-8')).toBe(handWritten);
      expect(written.filePath).toBeNull();
      expect(written.refusedPath).toBe(target);
      expect(written.warnings.join('\n')).toMatch(/namespaceOutput/);
    });
  });

  /**
   * The only assertions here that can fail for the right reason. A namespace that reads
   * correctly and does not compile is the failure mode this repo keeps finding.
   */
  describe('the emitted file compiles and the type is enforced', () => {
    function project(label: string, consumer: string, skipLibCheck = false): string {
      const root = scratch(label);
      writeFileSync(
        join(root, 'json-types.ts'),
        `import * as z from 'zod';
export const WorkflowNodeSchema = z.object({ id: z.string(), label: z.string().optional() });
export const PrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
`,
      );
      writeFileSync(join(root, 'consumer.ts'), consumer);
      writeFileSync(
        join(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2022',
            module: 'preserve',
            moduleResolution: 'bundler',
            strict: true,
            // Default off, so tsc actually looks at the declaration file under test.
            skipLibCheck,
            noEmit: true,
            types: [],
          },
          include: ['**/*.ts'],
        }),
      );
      return root;
    }

    async function emitInto(root: string): Promise<string> {
      const config = configOf();
      const written = await writeTypedJsonNamespace({
        bindings: [
          bindingOf('WorkflowNode', 'Workflow', 'nodes', config),
          bindingOf('Priority', 'Workflow', 'priority', config),
        ],
        config,
        baseDir: root,
      });
      expect(written.filePath).not.toBeNull();
      return written.filePath!;
    }

    function tsc(root: string): { code: number; output: string } {
      try {
        execFileSync(
          join(REPO_ROOT, 'node_modules', '.bin', 'tsc'),
          ['-p', join(root, 'tsconfig.json')],
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          },
        );
        return { code: 0, output: '' };
      } catch (error) {
        const err = error as { status?: number; stdout?: string; stderr?: string };
        return { code: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
      }
    }

    it('compiles under strict, and enforces a missing required property', async () => {
      const root = project(
        'compiles',
        `const ok: PrismaJson.WorkflowNode = { id: 'a' };
const withOptional: PrismaJson.WorkflowNode = { id: 'a', label: 'b' };
const priority: PrismaJson.Priority = 2;
// @ts-expect-error 'id' is required by the authored Zod schema
const missing: PrismaJson.WorkflowNode = { label: 'b' };
// @ts-expect-error 4 is not one of the literals the authored Zod schema allows
const outOfRange: PrismaJson.Priority = 4;
void ok; void withOptional; void priority; void missing; void outOfRange;
`,
      );
      await emitInto(root);
      const result = tsc(root);
      expect(result.output).toBe('');
      expect(result.code).toBe(0);
    }, 120_000);

    /**
     * Control. Without this, the case above would pass just as happily against a
     * namespace declaring `type WorkflowNode = any`, because `@ts-expect-error` only
     * proves an error happened somewhere on that line - and if no error happens, tsc
     * flags the unused directive, which is exactly what this asserts.
     */
    it('fails to compile when the invalid value is not marked, proving enforcement is real', async () => {
      const root = project(
        'enforces',
        `const missing: PrismaJson.WorkflowNode = { label: 'b' };
void missing;
`,
      );
      await emitInto(root);
      const result = tsc(root);
      expect(result.code).not.toBe(0);
      expect(result.output).toMatch(/TS2741|TS2739|Property 'id' is missing/);
    }, 120_000);

    /**
     * `skipLibCheck: true` is what most consumers actually have, and it stops tsc
     * checking declaration files. It does not stop a global augmentation *applying* - but
     * that is worth pinning, because if it did, the feature would be inert for the
     * majority of projects.
     */
    it('still applies the augmentation under skipLibCheck, the common consumer setting', async () => {
      const root = project(
        'skiplibcheck',
        `const ok: PrismaJson.WorkflowNode = { id: 'a' };
// @ts-expect-error 'id' is required by the authored Zod schema
const missing: PrismaJson.WorkflowNode = { label: 'b' };
void ok; void missing;
`,
        true,
      );
      await emitInto(root);
      const result = tsc(root);
      expect(result.output).toBe('');
      expect(result.code).toBe(0);
    }, 120_000);
  });
});

/* -------------------------------------------------------------------------- */

/**
 * `importFileExtension`, which the rest of the emitted tree already follows.
 *
 * A `prisma-client` generator with `moduleFormat = "esm"` and `importFileExtension = "js"`
 * is the supported NodeNext setup, and every other file the generator writes puts the
 * extension on its relative imports. The namespace file did not, which under
 * `moduleResolution: nodenext` is `error TS2835` - so the generated tree stopped
 * compiling as a whole because of one line in one file.
 *
 * The assertions that matter here are the `tsc` runs. Reading the emitted specifier only
 * says the string changed; running the compiler that rejected it is what says the tree
 * builds.
 */
describe('typedJson namespace emitter: import extensions', () => {
  /**
   * Exactly the compiler invocation a NodeNext consumer runs. The scratch package is
   * marked `"type": "module"`, because that is what makes the file ECMAScript to
   * TypeScript's resolver, and a missing extension only fails there.
   */
  function tscNodeNext(file: string): { code: number; output: string } {
    try {
      execFileSync(
        join(REPO_ROOT, 'node_modules', '.bin', 'tsc'),
        [
          '--noEmit',
          '--strict',
          '--target',
          'es2022',
          '--module',
          'nodenext',
          '--moduleResolution',
          'nodenext',
          file,
        ],
        { encoding: 'utf-8', stdio: 'pipe' },
      );
      return { code: 0, output: '' };
    } catch (error) {
      const err = error as { status?: number; stdout?: string; stderr?: string };
      return { code: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  }

  const JSON_TYPES_MODULE = `import * as z from 'zod';

export const WorkflowNodeSchema = z.object({ id: z.string(), label: z.string().optional() });
`;

  function esmScratch(label: string): string {
    const root = scratch(label);
    writeFileSync(join(root, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
    writeFileSync(join(root, 'json-types.ts'), JSON_TYPES_MODULE);
    return root;
  }

  it('appends the extension to a relative schemaModule, and the file then compiles', async () => {
    const root = esmScratch('nodenext-relative');
    const config = configOf();
    const written = await writeTypedJsonNamespace({
      bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
      config,
      baseDir: root,
      importExtension: '.js',
    });

    expect(readFileSync(written.filePath!, 'utf-8')).toContain(
      "import type { WorkflowNodeSchema } from './json-types.js';",
    );
    const result = tscNodeNext(written.filePath!);
    expect(result.output).toBe('');
    expect(result.code).toBe(0);
  }, 120_000);

  it('appends it to a rewritten nested specifier too', () => {
    const result = buildTypedJsonNamespace({
      bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes')],
      config: configOf({ namespaceOutput: './types/nested/prisma-json.d.ts' }),
      baseDir: '/out',
      importExtension: '.js',
    });
    expect(result.content).toContain(
      "import type { WorkflowNodeSchema } from '../../json-types.js';",
    );
  });

  it('leaves a package specifier alone', () => {
    const config = configOf({ schemaModule: '@acme/json-types' });
    const result = buildTypedJsonNamespace({
      bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
      config,
      baseDir: '/out',
      importExtension: '.js',
    });
    expect(result.content).toContain("import type { WorkflowNodeSchema } from '@acme/json-types';");
  });

  it('does not double an extension the user already wrote', () => {
    const config = configOf({ schemaModule: './json-types.js' });
    const result = buildTypedJsonNamespace({
      bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes', config)],
      config,
      baseDir: '/out',
      importExtension: '.js',
    });
    expect(result.content).toContain("import type { WorkflowNodeSchema } from './json-types.js';");
    expect(result.content).not.toContain('json-types.js.js');
  });

  it('writes the bare specifier when no extension is configured', () => {
    // The regression contract for everyone not on NodeNext: unchanged output.
    const result = buildTypedJsonNamespace({
      bindings: [bindingOf('WorkflowNode', 'Workflow', 'nodes')],
      config: configOf(),
      baseDir: '/out',
    });
    expect(result.content).toContain("import type { WorkflowNodeSchema } from './json-types';");
  });

  /**
   * The defect as reported: a real `prisma generate`, with the extension configured where
   * users configure it - on the `prisma-client` generator block, not on this generator.
   */
  describe('end to end, from the prisma-client generator block', () => {
    let outputDir: string;
    let testDir: string;

    beforeAll(async () => {
      const testEnv = await TestEnvironment.createTestEnv('typed-json-ns-nodenext');
      roots.push(testEnv.testDir);
      testDir = testEnv.testDir;
      outputDir = testEnv.outputDir;

      writeFileSync(
        join(testEnv.testDir, 'config.json'),
        JSON.stringify(
          {
            ...ConfigGenerator.createBasicConfig(),
            typedJson: { schemaModule: './json-types', emitNamespace: true },
          },
          null,
          2,
        ),
      );
      writeFileSync(
        testEnv.schemaPath,
        `
generator client {
  provider            = "prisma-client"
  output              = "./generated/client"
  moduleFormat        = "esm"
  importFileExtension = "js"
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

model Workflow {
  id Int @id @default(autoincrement())

  /// [WorkflowNode]
  nodes Json[]
}
`,
      );

      await testEnv.runGeneration();

      // Written after generation so the output-directory cleanup never sees them.
      writeFileSync(join(outputDir, 'schemas', 'json-types.ts'), JSON_TYPES_MODULE);
      writeFileSync(
        join(testDir, 'package.json'),
        `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
      );
    }, GENERATION_TIMEOUT);

    it('writes the same specifier the rest of the emitted tree writes', () => {
      const objects = readFileSync(
        join(outputDir, 'schemas', 'objects', 'WorkflowCreatenodesInput.schema.ts'),
        'utf-8',
      );
      expect(objects).toContain("from '../json-types.js'");

      const namespaceFile = join(outputDir, 'schemas', 'prisma-json-types.d.ts');
      expect(existsSync(namespaceFile)).toBe(true);
      expect(readFileSync(namespaceFile, 'utf-8')).toContain("from './json-types.js'");
    });

    it('compiles under --module nodenext --moduleResolution nodenext', () => {
      const result = tscNodeNext(join(outputDir, 'schemas', 'prisma-json-types.d.ts'));
      expect(result.output).toBe('');
      expect(result.code).toBe(0);
    }, 120_000);
  });
});
