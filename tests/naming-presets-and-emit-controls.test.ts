import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

/**
 * Two documented features with no test between them.
 *
 * `naming.preset` is the migration path for people arriving from zod-prisma or
 * zod-prisma-types — it decides the file name and the exported symbol names, so a regression
 * here silently breaks every import in a migrated codebase while still generating valid schemas.
 *
 * `emit.*` flags are documented as off switches: read as `!== false`, so a flag can suppress a
 * category but setting one to `true` never forces a category on that is off for another reason.
 * That asymmetry is easy to "fix" into a bug.
 *
 * Both were verified by hand against config/naming.md and config/emission-controls.md before
 * these tests were written; they pin behaviour that is already correct.
 */
describe('naming presets and emit controls', () => {
  const root = join(process.cwd(), `test-env-naming-emit-${process.pid}`);

  const SCHEMA = `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
  config   = "./config.json"
}

enum Role {
  OWNER
  MEMBER
}

model User {
  id    String @id @default(cuid())
  email String @unique
  role  Role   @default(MEMBER)
}
`;

  /** A MySQL schema whose fields trigger this provider's annotation rules. */
  const MYSQL_SCHEMA = `datasource db {
  provider = "mysql"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
  config   = "./config.json"
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  createdAt DateTime @default(now())
}
`;

  const outputs: Record<string, string> = {};

  function generateWith(label: string, schema: string, config: Record<string, unknown>) {
    const dir = join(root, label);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.json'), JSON.stringify(config));
    writeFileSync(join(dir, 'schema.prisma'), schema);

    prismaGenerateSync(join(dir, 'schema.prisma'), process.cwd());
    outputs[label] = join(dir, 'generated');
  }

  function generate(label: string, config: Record<string, unknown>) {
    const dir = join(root, label);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'config.json'), JSON.stringify(config));
    writeFileSync(join(dir, 'schema.prisma'), SCHEMA);

    prismaGenerateSync(join(dir, 'schema.prisma'), process.cwd());
    outputs[label] = join(dir, 'generated');
  }

  beforeAll(() => {
    mkdirSync(root, { recursive: true });

    for (const preset of ['default', 'zod-prisma', 'zod-prisma-types', 'legacy-model-suffix'])
      generate(preset, { pureModels: true, naming: { preset } });

    generate('emit-pure-only', { emit: { pureModels: true } });
    generate('emit-no-enums', { pureModels: true, emit: { enums: false } });

    generateWith('mysql-verbose', MYSQL_SCHEMA, {
      pureModels: true,
      pureModelsLean: false,
    });
    generateWith('mysql-lean', MYSQL_SCHEMA, { pureModels: true });
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** The single pure-model file a preset produced, with its name. */
  function pureModel(label: string): { file: string; source: string } {
    const dir = join(outputs[label], 'schemas', 'models');
    const file = [`User.schema.ts`, `User.model.ts`].find((name) => existsSync(join(dir, name)));
    expect(file, `no pure model file found for ${label}`).toBeDefined();
    return { file: file!, source: readFileSync(join(dir, file!), 'utf-8') };
  }

  describe('naming presets', () => {
    it('default: User.schema.ts exporting UserSchema and UserType', () => {
      const { file, source } = pureModel('default');

      expect(file).toBe('User.schema.ts');
      expect(source).toMatch(/export const UserSchema\b/);
      expect(source).toMatch(/export type UserType\b/);
    });

    it('zod-prisma: the default names plus a legacy alias', () => {
      const { file, source } = pureModel('zod-prisma');

      expect(file).toBe('User.schema.ts');
      expect(source).toMatch(/export const UserSchema\b/);
      // The alias is the whole point of this preset over `default`.
      expect(source).toMatch(/export const UserModel\b/);
    });

    it('zod-prisma-types: the unsuffixed name, with the suffixed ones kept as aliases', () => {
      const { file, source } = pureModel('zod-prisma-types');

      expect(file).toBe('User.schema.ts');
      expect(source).toMatch(/export const User\b/);
      // Migrating from zod-prisma-types means `import { User }`; dropping the aliases would
      // break anyone who had moved on to UserSchema.
      expect(source).toMatch(/export const UserSchema\b/);
    });

    it('legacy-model-suffix: User.model.ts exporting UserModel', () => {
      const { file, source } = pureModel('legacy-model-suffix');

      expect(file).toBe('User.model.ts');
      expect(source).toMatch(/export const UserModel\b/);
    });

    it('gives every preset a distinct file-and-export combination', () => {
      // If two presets collapsed onto the same output, one of them would be a silent no-op.
      const shapes = ['default', 'zod-prisma', 'zod-prisma-types', 'legacy-model-suffix'].map(
        (preset) => {
          const { file, source } = pureModel(preset);
          const exports = [...source.matchAll(/export const (\w+)/g)].map((m) => m[1]).sort();
          return `${file}:${exports.join(',')}`;
        },
      );

      expect(new Set(shapes).size).toBe(shapes.length);
    });
  });

  /**
   * The pure-model type mapper takes a `provider` and has PostgreSQL/MySQL/SQLite/MongoDB
   * branches that annotate the emitted schema. It was reading `Transformer.config.provider`,
   * a property that does not exist — behind an `as unknown as` cast, so the compiler could not
   * say so — and every project therefore fell back to 'postgresql'.
   *
   * Only comment text and a `databaseSpecific.optimizations` array nothing reads depend on it,
   * so nothing was mis-generated. But a MySQL project got PostgreSQL's annotations, and the
   * branches written for the other three providers never ran.
   */
  describe('provider-specific pure model annotations', () => {
    it('annotates a MySQL schema with MySQL notes', () => {
      const source = readFileSync(
        join(outputs['mysql-verbose'], 'schemas', 'models', 'Post.schema.ts'),
        'utf-8',
      );

      expect(source).toContain('MySQL AUTO_INCREMENT primary key');
      expect(source).toContain('MySQL TIMESTAMP with default value');
      // And not another provider's.
      expect(source).not.toContain('PostgreSQL serial');
    });

    it('says nothing provider-specific in lean mode, which is the default', () => {
      // pureModelsLean defaults to true and strips these comments; the annotations are an
      // opt-in verbosity, not part of the schema.
      const lean = readFileSync(
        join(outputs['mysql-lean'], 'schemas', 'models', 'Post.schema.ts'),
        'utf-8',
      );

      expect(lean).not.toContain('MySQL AUTO_INCREMENT');
    });
  });

  describe('emit controls', () => {
    it('emit.pureModels alone does not turn pure models on', () => {
      // Documented explicitly: these are off switches. `pureModels` must also be true.
      expect(existsSync(join(outputs['emit-pure-only'], 'schemas', 'models'))).toBe(false);
    });

    it('emit.enums false suppresses the enums directory', () => {
      expect(existsSync(join(outputs['emit-no-enums'], 'schemas', 'enums'))).toBe(false);
      // …while the rest of the output is still produced.
      expect(existsSync(join(outputs['emit-no-enums'], 'schemas', 'objects'))).toBe(true);
    });

    it('still emits enums by default', () => {
      expect(existsSync(join(outputs['default'], 'schemas', 'enums', 'Role.schema.ts'))).toBe(true);
    });
  });
});
