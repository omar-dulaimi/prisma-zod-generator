import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Count output type select where filters', () => {
  it(
    'generates select schemas that accept boolean or where clause objects',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('count-output-type-select-where');

      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          prismaClientPath: '@prisma/client',
          addSelectType: true,
          addIncludeType: true,
        };

        const configPath = join(testEnv.testDir, 'zod-generator.config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "${testEnv.outputDir}/client"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./zod-generator.config.json"
}

model AbTest {
  id                Int      @id @default(autoincrement())
  name              String   @unique
  enabled           Boolean  @default(false)
  trafficAllocation Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  abTestOptions AbTestOption[]
  domains       Domain[]
}

model AbTestOption {
  id        Int      @id @default(autoincrement())
  abTestId  Int
  option    String
  percent   Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  abTest AbTest @relation(fields: [abTestId], references: [id])
}

model Domain {
  id        Int      @id @default(autoincrement())
  domain    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  abTests AbTest[]
}
`;

        writeFileSync(testEnv.schemaPath, schema.trimStart());

        await testEnv.runGeneration();

        const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
        const selectSchemaPath = join(objectsDir, 'AbTestCountOutputTypeSelect.schema.ts');
        expect(existsSync(selectSchemaPath)).toBe(true);
        const selectSchemaContent = readFileSync(selectSchemaPath, 'utf-8');

        expect(selectSchemaContent).toContain(
          'abTestOptions: z.union([z.boolean(), z.lazy(() => AbTestCountOutputTypeCountAbTestOptionsArgsObjectSchema)])',
        );
        expect(selectSchemaContent).toContain(
          'domains: z.union([z.boolean(), z.lazy(() => AbTestCountOutputTypeCountDomainsArgsObjectSchema)])',
        );

        const countOptionsArgsPath = join(
          objectsDir,
          'AbTestCountOutputTypeCountAbTestOptionsArgs.schema.ts',
        );
        const countDomainsArgsPath = join(
          objectsDir,
          'AbTestCountOutputTypeCountDomainsArgs.schema.ts',
        );

        expect(existsSync(countOptionsArgsPath)).toBe(true);
        expect(existsSync(countDomainsArgsPath)).toBe(true);

        const countDomainsArgsContent = readFileSync(countDomainsArgsPath, 'utf-8');
        expect(countDomainsArgsContent).toContain(
          'where: z.lazy(() => DomainWhereInputObjectSchema).optional()',
        );
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
