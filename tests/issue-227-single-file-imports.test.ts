import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestEnvironment, ConfigGenerator, GENERATION_TIMEOUT } from './helpers';

describe('GitHub Issue #227 - Single File Mode Import Fixes', () => {
  describe('@prisma/client Import Path Fix', () => {
    it(
      'should generate clean @prisma/client import instead of deeply nested node_modules path',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-227-prisma-import');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: false, // Enable single-file mode
          };
          const configPath = join(testEnv.testDir, 'config.json');

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  name     String?
  posts    Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const bundlePath = join(schemasDir, 'schemas.ts');

          expect(existsSync(bundlePath)).toBe(true);

          const content = readFileSync(bundlePath, 'utf-8');

          // Should have clean @prisma/client import
          expect(content).toMatch(/import type \{ Prisma \} from '@prisma\/client';/);

          // Should NOT have deeply nested node_modules path
          expect(content).not.toMatch(/node_modules.*@prisma.*client/);
          expect(content).not.toMatch(/\.pnpm/);

          // Should not contain any absolute paths to node_modules
          expect(content).not.toMatch(/\/node_modules\//);

          // Verify the import is at the top of the file
          const lines = content.split('\n');
          const importLine = lines.find((line) => line.includes('import type { Prisma }'));
          expect(importLine).toBeTruthy();
          expect(importLine).toBe("import type { Prisma } from '@prisma/client';");
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle custom Prisma client output paths without node_modules references',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-227-custom-client');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: false,
          };
          const configPath = join(testEnv.testDir, 'config.json');

          const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "./custom-client"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const bundlePath = join(schemasDir, 'schemas.ts');

          // Explicitly assert that the bundle exists - test should fail loudly if generation failed
          expect(existsSync(bundlePath)).toBeTruthy();
          
          const content = readFileSync(bundlePath, 'utf-8');

          // Should either use clean @prisma/client or a relative path, but never node_modules paths
          expect(content).not.toMatch(/node_modules.*@prisma.*client/);
          expect(content).not.toMatch(/\.pnpm/);

          // Should have a Prisma import line
          expect(content).toMatch(/import.*Prisma.*from/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Single File Mode with Zod Annotations', () => {
    it(
      'should properly bundle all Issue #227 fixes in single-file mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-227-single-file-complete');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: false,
            pureModels: true,
          };
          const configPath = join(testEnv.testDir, 'config.json');

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

enum Role {
  USER
  ADMIN
}

model User {
  id          Int     @id @default(autoincrement())
  /// @zod.email().max(100).trim().toLowerCase()
  email       String  @unique
  /// @zod .min(2).max(50).trim()
  name        String?
  /// @zod .min(0).max(120)
  age         Int?
  role        Role    @default(USER)
  /// @zod .optional()
  posts       Post[]
}

model Post {
  id          Int     @id @default(autoincrement())
  /// @zod .min(1).max(200).trim()
  title       String
  author      User    @relation(fields: [authorId], references: [id])
  authorId    Int
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const bundlePath = join(schemasDir, 'schemas.ts');

          expect(existsSync(bundlePath)).toBe(true);

          const content = readFileSync(bundlePath, 'utf-8');

          // Clean @prisma/client import
          expect(content).toMatch(/import type \{ Prisma \} from '@prisma\/client';/);
          expect(content).not.toMatch(/node_modules/);

          // Should contain enum schemas
          expect(content).toMatch(/export const RoleSchema/);

          // Should contain pure model schemas with all fixes applied
          expect(content).toMatch(/export const UserSchema/);
          expect(content).toMatch(/export const PostSchema/);

          // Zod v4 email syntax
          expect(content).toMatch(/z\.email\(\)\.max\(100\)\.trim\(\)\.toLowerCase\(\)/);

          // Spacing tolerance fixes
          expect(content).toMatch(/\.min\(2\)/);
          expect(content).toMatch(/\.max\(50\)/);
          expect(content).toMatch(/\.trim\(\)/);
          expect(content).toMatch(/\.min\(0\)/);
          expect(content).toMatch(/\.max\(120\)/);

          // Should contain CRUD schemas with relationship optionality
          // Look for UserCreateInput or similar schemas that should have relationship optionality preserved
          if (content.includes('posts:')) {
            // Posts relationship handling might vary by schema type
            // The key thing is that our fix preserves .optional() when explicitly requested
            const hasOptionalPattern = content.includes('.optional()');
            expect(hasOptionalPattern).toBe(true);
          }

          // Verify it's truly a single file
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const schemasFiles = require('fs')
            .readdirSync(schemasDir)
            .filter((f: string) => f.endsWith('.ts'));
          expect(schemasFiles).toHaveLength(1);
          expect(schemasFiles[0]).toBe('schemas.ts');
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Edge Cases', () => {
    it(
      'should handle node_modules detection in various scenarios',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-227-edge-cases');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: false,
          };
          const configPath = join(testEnv.testDir, 'config.json');

          // Create a schema with a path that contains 'node_modules' but shouldn't trigger the fix
          const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "./my-node-modules-like-path/client"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model TestModel {
  id   Int    @id @default(autoincrement())
  name String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const bundlePath = join(schemasDir, 'schemas.ts');

          // Explicitly assert that the bundle exists - test should fail loudly if generation failed
          expect(existsSync(bundlePath)).toBe(true);
          
          const content = readFileSync(bundlePath, 'utf-8');

          // Should not have the deeply nested pnpm path regardless
          expect(content).not.toMatch(/\.pnpm/);
          expect(content).not.toMatch(/node_modules.*@prisma.*client/);

          // Should have some form of Prisma import
          expect(content).toMatch(/import.*Prisma.*from/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
