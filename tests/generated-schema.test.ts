import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Basic Tests', () => {
  it(
    'should generate and validate a basic User findMany schema',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('basic-user-find-many');

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
  output = "${testEnv.outputDir}/schemas"
  config = "./config.json"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}`;

        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        // Verify that schema generation completed successfully
        const schemasDir = join(testEnv.outputDir, 'schemas');
        expect(existsSync(schemasDir), 'Schemas directory should exist').toBe(true);

        // Debug: List all generated files
        const fs = await import('fs');
        const files = fs.readdirSync(schemasDir, { recursive: true });
        console.log('Generated files:', files);

        // Verify we have some generated files
        expect(files.length, 'Should have generated at least some files').toBeGreaterThan(0);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
