import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment } from './helpers';

const GENERATION_TIMEOUT = 60_000;

describe('Explicit emission controls (emit.*)', () => {
  it(
    'should emit only pure models when crud, objects, results disabled',
    async () => {
      const env = await TestEnvironment.createTestEnv('emit-pure-only');
      try {
        const config = {
          mode: 'custom',
          pureModels: true,
          emit: {
            enums: true,
            objects: false,
            crud: false,
            results: false,
            pureModels: true,
            variants: true,
          },
          variants: {
            pure: { enabled: true, suffix: '.model' },
            input: { enabled: false, suffix: '.input' },
            result: { enabled: false, suffix: '.result' },
          },
        } as Partial<import('../src/config/parser').GeneratorConfig>;

        const schema = `datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${env.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`;

        writeFileSync(join(env.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();

        const base = join(env.outputDir, 'schemas');
        expect(
          existsSync(join(base, 'variants', 'pure', 'User.pure.ts')) ||
            existsSync(join(base, 'variants', 'pure', 'User.model.ts')),
        ).toBe(true);
        expect(existsSync(join(base, 'objects'))).toBe(false);
        expect(existsSync(join(base, 'results'))).toBe(false);
        // CRUD file pattern (findMany)
        const crudFindMany = [
          'findManyUser.schema.ts',
          'UserFindMany.schema.ts',
          'findManyUserArgs.schema.ts',
        ]
          .map((f) => join(base, f))
          .some((p) => existsSync(p));
        expect(crudFindMany).toBe(false);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'should skip enums when emit.enums=false',
    async () => {
      const env = await TestEnvironment.createTestEnv('emit-no-enums');
      try {
        const config = {
          mode: 'custom',
          pureModels: true,
          emit: { enums: false, pureModels: true, objects: false, crud: false, results: false },
          variants: {
            pure: { enabled: true, suffix: '.model' },
            input: { enabled: false },
            result: { enabled: false },
          },
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const schema = `datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${env.outputDir}/schemas"
  config   = "./config.json"
}

enum Role {
  USER
  ADMIN
}

model User {
  id   Int  @id @default(autoincrement())
  role Role?
}
`;
        writeFileSync(join(env.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();
        const enumsDir = join(env.outputDir, 'schemas', 'enums');
        expect(existsSync(enumsDir)).toBe(false);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'should emit crud but not results when configured',
    async () => {
      const env = await TestEnvironment.createTestEnv('emit-crud-only');
      try {
        const config = {
          mode: 'custom',
          pureModels: false,
          emit: { crud: true, objects: true, results: false, pureModels: false },
          variants: {
            pure: { enabled: false },
            input: { enabled: false },
            result: { enabled: false },
          },
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const schema = `datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${env.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`;
        writeFileSync(join(env.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();
        const base = join(env.outputDir, 'schemas');
        expect(
          existsSync(join(base, 'UserFindMany.schema.ts')) ||
            existsSync(join(base, 'findManyUser.schema.ts')),
        ).toBe(true);
        expect(existsSync(join(base, 'results'))).toBe(false);
        expect(existsSync(join(base, 'variants'))).toBe(false);
        expect(existsSync(join(base, 'objects'))).toBe(true);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
