import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #386: typed JSON fields. A Json field annotated with
 * @zod.import([...]).custom.use(z.array(FooSchema)) replaces the default
 * jsonSchema/z.unknown() base with the referenced schema, in both CRUD object
 * schemas and pure models, and emits the referenced import.
 */
describe('Issue #386: typed JSON fields via @zod.custom.use', () => {
  const annotation =
    '/// @zod.import(["import { WorkflowNodeSchema } from \'workflow-types\'"]).custom.use(z.array(WorkflowNodeSchema))';

  async function generate(envName: string, extra: Record<string, unknown>) {
    const testEnv = await TestEnvironment.createTestEnv(envName);
    const config = { ...ConfigGenerator.createBasicConfig(), ...extra };
    const schema = `
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

model Workflow {
  id    Int  @id @default(autoincrement())
  ${annotation}
  nodes Json
  edges Json
}
`;
    writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
    writeFileSync(testEnv.schemaPath, schema);
    await testEnv.runGeneration();
    return testEnv;
  }

  it(
    'uses the referenced schema for the annotated Json field in CRUD object schemas',
    async () => {
      const testEnv = await generate('issue-386-objects', {});
      try {
        const content = readFileSync(
          join(testEnv.outputDir, 'schemas', 'objects', 'WorkflowCreateInput.schema.ts'),
          'utf-8',
        );
        expect(content).toContain("import { WorkflowNodeSchema } from 'workflow-types'");
        expect(content).toMatch(/nodes:\s*z\.union\(\[[^\]]*z\.array\(WorkflowNodeSchema\)\]\)/);
        // The un-annotated field keeps the default json schema
        expect(content).toMatch(/edges:\s*z\.union\(\[[^\]]*jsonSchema\]\)/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'uses the referenced schema for the annotated Json field in pure models',
    async () => {
      const testEnv = await generate('issue-386-pure', { pureModels: true });
      try {
        const content = readFileSync(
          join(testEnv.outputDir, 'schemas', 'models', 'Workflow.schema.ts'),
          'utf-8',
        );
        expect(content).toContain("import { WorkflowNodeSchema } from 'workflow-types'");
        expect(content).toMatch(/nodes:\s*z\.array\(WorkflowNodeSchema\)/);
        // The un-annotated field is not turned into the custom schema
        expect(content).not.toMatch(/edges:\s*z\.array\(WorkflowNodeSchema\)/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
