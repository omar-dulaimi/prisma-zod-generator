import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('@zod.custom.use override', () => {
  it(
    'replaces Json field schema and skips depth validator',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-custom-use');
      try {
        const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true };
        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

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

model Chat {
  id       Int  @id @default(autoincrement())
  /// @zod.custom.use(z.array(z.object({ msg: z.string() })))
  payload  Json @default("[]")
}
`;
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        const modelFile = join(testEnv.outputDir, 'schemas', 'models', 'Chat.schema.ts');
        const content = readFileSync(modelFile, 'utf-8');
        expect(content).toMatch(/payload:\s*z.array\(z.object\(\{ msg: z.string\(\) \}\)\)/);
        expect(content).not.toMatch(/getDepth/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
