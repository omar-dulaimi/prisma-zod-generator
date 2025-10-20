import { describe, it, expect } from 'vitest';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TestEnvironment, ConfigGenerator, GENERATION_TIMEOUT } from './helpers';

describe('Enum Array @zod chain composition', () => {
  it(
    'composes enum references with dot-chains and targets array length',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('enum-array-zod-chain');

      try {
        const config = ConfigGenerator.createBasicConfig();
        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

enum Role {
  USER
  ADMIN
}

model User {
  id     Int     @id @default(autoincrement())
  name   String?
  /// @zod.min(1)
  roles  Role[]
}
`;

        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
        const createInputPath = join(objectsDir, 'UserCreateInput.schema.ts');
        expect(existsSync(createInputPath), 'UserCreateInput schema should exist').toBe(true);

        const content = readFileSync(createInputPath, 'utf-8');

        // Accept either z.array(RoleSchema).min(1) or RoleSchema.array().min(1), possibly within a union
        const pattern1 = /z\.array\(\s*RoleSchema\s*\)\.min\(1\)/;
        const pattern2 = /RoleSchema\.array\(\)\.min\(1\)/;
        const matches = pattern1.test(content) || pattern2.test(content);
        expect(matches, 'Enum array @zod.min should target the array').toBe(true);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
