import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment } from './helpers/mock-generators';

// Basic schema with two models and an enum to verify strict mode behavior
const prismaSchema = (outputDir: string, configRef: string) => `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${outputDir}/schemas"
  config   = "./${configRef}"
}

enum Status {
  ACTIVE
  INACTIVE
}

model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  posts Post[]
  status Status @default(ACTIVE)
}

model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
  user    User   @relation(fields: [userId], references: [id])
  userId  Int
}
`;

describe('Strict Mode Control', () => {
  it('applies global strict mode enabled (default behavior)', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-global-enabled');
    try {
      const config = {
        strictMode: {
          enabled: true,
          operations: true,
          objects: true,
          variants: true,
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check operation schemas have .strict()
      const operationFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(operationFile)).toBe(true);
      const operationContent = readFileSync(operationFile, 'utf-8');
      expect(operationContent).toMatch(/\}\)\.strict\(\)/);

      // Check object schemas have .strict()
      const objectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(objectFile)).toBe(true);
      const objectContent = readFileSync(objectFile, 'utf-8');
      expect(objectContent).toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies global strict mode disabled', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-global-disabled');
    try {
      const config = {
        strictMode: {
          enabled: false,
          operations: false,
          objects: false,
          variants: false,
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check operation schemas do NOT have .strict()
      const operationFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(operationFile)).toBe(true);
      const operationContent = readFileSync(operationFile, 'utf-8');
      expect(operationContent).not.toMatch(/\}\)\.strict\(\)/);

      // Check object schemas do NOT have .strict()
      const objectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(objectFile)).toBe(true);
      const objectContent = readFileSync(objectFile, 'utf-8');
      expect(objectContent).not.toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies selective schema type strict mode (operations only)', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-operations-only');
    try {
      const config = {
        strictMode: {
          enabled: true,
          operations: true,
          objects: false,
          variants: false,
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check operation schemas HAVE .strict()
      const operationFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(operationFile)).toBe(true);
      const operationContent = readFileSync(operationFile, 'utf-8');
      expect(operationContent).toMatch(/\}\)\.strict\(\)/);

      // Check object schemas do NOT have .strict()
      const objectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(objectFile)).toBe(true);
      const objectContent = readFileSync(objectFile, 'utf-8');
      expect(objectContent).not.toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies model-level strict mode overrides', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-model-overrides');
    try {
      const config = {
        strictMode: {
          enabled: true, // Global enabled
          operations: false, // Operations globally disabled
          objects: false, // Objects globally disabled
        },
        models: {
          User: {
            strictMode: {
              enabled: true, // Override for User model
              operations: true, // Enable operations for User
              objects: true, // Enable objects for User
            },
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      // Debug: Check what configuration was written
      console.log('Test config content:', JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Debug: List all generated files
      const schemasDir = join(env.outputDir, 'schemas');
      const allFiles = (await import('fs')).readdirSync(schemasDir, { recursive: true });
      console.log(
        'Generated files:',
        allFiles.filter((f) => f.includes('Post') || f.includes('User')),
      );

      // Check User operation schemas HAVE .strict() (model override)
      const userOperationFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(userOperationFile)).toBe(true);
      const userOperationContent = readFileSync(userOperationFile, 'utf-8');
      expect(userOperationContent).toMatch(/\}\)\.strict\(\)/);

      // Check Post operation schemas do NOT have .strict() (global setting)
      const postOperationFile = join(env.outputDir, 'schemas', 'findManyPost.schema.ts');
      if (!existsSync(postOperationFile)) {
        // Try alternative naming
        const altPostFile = join(env.outputDir, 'schemas', 'findManyPost.schema.ts');
        console.log('Post file does not exist, checking alt:', existsSync(altPostFile));
        console.log('Available schema files:', allFiles);
      }
      expect(existsSync(postOperationFile)).toBe(true);
      const postOperationContent = readFileSync(postOperationFile, 'utf-8');
      expect(postOperationContent).not.toMatch(/\}\)\.strict\(\)/);

      // Check User object schemas HAVE .strict() (model override)
      const userObjectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(userObjectFile)).toBe(true);
      const userObjectContent = readFileSync(userObjectFile, 'utf-8');
      expect(userObjectContent).toMatch(/\}\)\.strict\(\)/);

      // Check Post object schemas do NOT have .strict() (global setting)
      const postObjectFile = join(env.outputDir, 'schemas', 'objects', 'PostCreateInput.schema.ts');
      expect(existsSync(postObjectFile)).toBe(true);
      const postObjectContent = readFileSync(postObjectFile, 'utf-8');
      expect(postObjectContent).not.toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies specific operation strict mode control', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-specific-operations');
    try {
      const config = {
        strictMode: {
          enabled: false, // Global disabled
          operations: false,
        },
        models: {
          User: {
            strictMode: {
              operations: ['findMany', 'create'], // Only these operations get strict mode
            },
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check findMany operation SHOULD have .strict() (included in operations list)
      const findManyFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(findManyFile)).toBe(true);
      const findManyContent = readFileSync(findManyFile, 'utf-8');
      expect(findManyContent).toMatch(/\}\)\.strict\(\)/);

      // Check update operation should NOT have .strict() (not in operations list)
      const updateFile = join(env.outputDir, 'schemas', 'updateOneUser.schema.ts');
      if (existsSync(updateFile)) {
        const updateContent = readFileSync(updateFile, 'utf-8');
        expect(updateContent).not.toMatch(/\}\)\.strict\(\)/);
      }
    } finally {
      await env.cleanup();
    }
  });

  it('applies operation exclusion strict mode control', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-operation-exclusion');
    try {
      const config = {
        strictMode: {
          enabled: true, // Global enabled
          operations: true,
        },
        models: {
          User: {
            strictMode: {
              exclude: ['update'], // Exclude update operations from strict mode
            },
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check findMany operation SHOULD have .strict() (not excluded)
      const findManyFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(findManyFile)).toBe(true);
      const findManyContent = readFileSync(findManyFile, 'utf-8');
      expect(findManyContent).toMatch(/\}\)\.strict\(\)/);

      // Check update operation should NOT have .strict() (excluded)
      const updateFile = join(env.outputDir, 'schemas', 'updateOneUser.schema.ts');
      if (existsSync(updateFile)) {
        const updateContent = readFileSync(updateFile, 'utf-8');
        expect(updateContent).not.toMatch(/\}\)\.strict\(\)/);
      }
    } finally {
      await env.cleanup();
    }
  });

  it('applies variant-level strict mode control', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-variants');
    try {
      const config = {
        strictMode: {
          enabled: true,
          variants: false, // Global variants disabled
        },
        variants: {
          pure: {
            enabled: true,
            strictMode: true, // Pure variant gets strict mode
          },
          input: {
            enabled: true,
            strictMode: false, // Input variant does not get strict mode
          },
          result: {
            enabled: true,
            // Uses global setting (false)
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      const variantsDir = join(env.outputDir, 'schemas', 'variants');

      // Check pure variant SHOULD have .strict()
      const pureDir = join(variantsDir, 'pure');
      if (existsSync(pureDir)) {
        const pureFiles = (await import('fs')).readdirSync(pureDir);
        const userPureFile = pureFiles.find((f) => f.includes('User'));
        if (userPureFile) {
          const pureContent = readFileSync(join(pureDir, userPureFile), 'utf-8');
          expect(pureContent).toMatch(/\}\)\.strict\(\)/);
        }
      }

      // Check input variant should NOT have .strict()
      const inputDir = join(variantsDir, 'input');
      if (existsSync(inputDir)) {
        const inputFiles = (await import('fs')).readdirSync(inputDir);
        const userInputFile = inputFiles.find((f) => f.includes('User'));
        if (userInputFile) {
          const inputContent = readFileSync(join(inputDir, userInputFile), 'utf-8');
          expect(inputContent).not.toMatch(/\}\)\.strict\(\)/);
        }
      }

      // Check result variant should NOT have .strict() (uses global setting)
      const resultDir = join(variantsDir, 'result');
      if (existsSync(resultDir)) {
        const resultFiles = (await import('fs')).readdirSync(resultDir);
        const userResultFile = resultFiles.find((f) => f.includes('User'));
        if (userResultFile) {
          const resultContent = readFileSync(join(resultDir, userResultFile), 'utf-8');
          expect(resultContent).not.toMatch(/\}\)\.strict\(\)/);
        }
      }
    } finally {
      await env.cleanup();
    }
  });

  it('applies model-level variant strict mode overrides', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-model-variant-overrides');
    try {
      const config = {
        strictMode: {
          enabled: false, // Global disabled
          variants: false,
        },
        models: {
          User: {
            strictMode: {
              variants: {
                pure: true, // Override for User pure variant
                input: false, // Explicit false for User input variant
                // result uses global (false)
              },
            },
          },
        },
        variants: {
          pure: { enabled: true },
          input: { enabled: true },
          result: { enabled: true },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      const variantsDir = join(env.outputDir, 'schemas', 'variants');

      // Check User pure variant SHOULD have .strict() (model override)
      const pureDir = join(variantsDir, 'pure');
      if (existsSync(pureDir)) {
        const pureFiles = (await import('fs')).readdirSync(pureDir);
        const userPureFile = pureFiles.find((f) => f.includes('User'));
        if (userPureFile) {
          const userPureContent = readFileSync(join(pureDir, userPureFile), 'utf-8');
          expect(userPureContent).toMatch(/\}\)\.strict\(\)/);
        }

        // Check Post pure variant should NOT have .strict() (global setting)
        const postPureFile = pureFiles.find((f) => f.includes('Post'));
        if (postPureFile) {
          const postPureContent = readFileSync(join(pureDir, postPureFile), 'utf-8');
          expect(postPureContent).not.toMatch(/\}\)\.strict\(\)/);
        }
      }

      // Check User input variant should NOT have .strict() (explicit model override)
      const inputDir = join(variantsDir, 'input');
      if (existsSync(inputDir)) {
        const inputFiles = (await import('fs')).readdirSync(inputDir);
        const userInputFile = inputFiles.find((f) => f.includes('User'));
        if (userInputFile) {
          const inputContent = readFileSync(join(inputDir, userInputFile), 'utf-8');
          expect(inputContent).not.toMatch(/\}\)\.strict\(\)/);
        }
      }
    } finally {
      await env.cleanup();
    }
  });

  it('respects hierarchy: operation-level > model-level > global', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-hierarchy');
    try {
      const config = {
        strictMode: {
          enabled: false, // Global: disabled
          operations: false,
          objects: false,
        },
        models: {
          User: {
            strictMode: {
              enabled: true, // Model: enabled (overrides global)
              operations: true,
              objects: false, // Model: objects disabled
            },
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // User operations should be strict (model-level override)
      const userOperationFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(userOperationFile)).toBe(true);
      const userOperationContent = readFileSync(userOperationFile, 'utf-8');
      expect(userOperationContent).toMatch(/\}\)\.strict\(\)/);

      // User objects should NOT be strict (model-level objects: false)
      const userObjectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(userObjectFile)).toBe(true);
      const userObjectContent = readFileSync(userObjectFile, 'utf-8');
      expect(userObjectContent).not.toMatch(/\}\)\.strict\(\)/);

      // Post operations should NOT be strict (global disabled, no model override)
      const postOperationFile = join(env.outputDir, 'schemas', 'findManyPost.schema.ts');
      expect(existsSync(postOperationFile)).toBe(true);
      const postOperationContent = readFileSync(postOperationFile, 'utf-8');
      expect(postOperationContent).not.toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });

  it('handles mixed configuration with complex overrides', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-complex-config');
    try {
      const config = {
        strictMode: {
          enabled: true, // Global: enabled
          operations: true,
          objects: false,
          variants: true,
        },
        models: {
          User: {
            strictMode: {
              operations: ['findMany'], // Only findMany gets strict mode
              exclude: ['create'], // Exclude create even though operations is true globally
              objects: true, // Override global objects setting
              variants: {
                pure: false, // Override variant setting for pure
                input: true, // Override variant setting for input
              },
            },
          },
          Post: {
            strictMode: {
              enabled: false, // Disable everything for Post model
            },
          },
        },
        variants: {
          pure: { enabled: true },
          input: { enabled: true },
          result: { enabled: true },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // User findMany should be strict (in operations list)
      const userFindManyFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(userFindManyFile)).toBe(true);
      const userFindManyContent = readFileSync(userFindManyFile, 'utf-8');
      expect(userFindManyContent).toMatch(/\}\)\.strict\(\)/);

      // User create should NOT be strict (in exclude list)
      const userCreateFile = join(env.outputDir, 'schemas', 'createOneUser.schema.ts');
      if (existsSync(userCreateFile)) {
        const userCreateContent = readFileSync(userCreateFile, 'utf-8');
        expect(userCreateContent).not.toMatch(/\}\)\.strict\(\)/);
      }

      // User objects should be strict (model override)
      const userObjectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(userObjectFile)).toBe(true);
      const userObjectContent = readFileSync(userObjectFile, 'utf-8');
      expect(userObjectContent).toMatch(/\}\)\.strict\(\)/);

      // Post operations should NOT be strict (model disabled)
      const postFindManyFile = join(env.outputDir, 'schemas', 'findManyPost.schema.ts');
      expect(existsSync(postFindManyFile)).toBe(true);
      const postFindManyContent = readFileSync(postFindManyFile, 'utf-8');
      expect(postFindManyContent).not.toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });

  it('maintains backward compatibility when no strictMode config provided', async () => {
    const env = await TestEnvironment.createTestEnv('strict-mode-backward-compatibility');
    try {
      const config = {
        // No strictMode configuration - should default to strict: true everywhere
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // All schemas should have .strict() by default for backward compatibility
      const operationFile = join(env.outputDir, 'schemas', 'findManyUser.schema.ts');
      expect(existsSync(operationFile)).toBe(true);
      const operationContent = readFileSync(operationFile, 'utf-8');
      expect(operationContent).toMatch(/\}\)\.strict\(\)/);

      const objectFile = join(env.outputDir, 'schemas', 'objects', 'UserCreateInput.schema.ts');
      expect(existsSync(objectFile)).toBe(true);
      const objectContent = readFileSync(objectFile, 'utf-8');
      expect(objectContent).toMatch(/\}\)\.strict\(\)/);
    } finally {
      await env.cleanup();
    }
  });
});
