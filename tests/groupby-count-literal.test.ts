import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { PrismaSchemaGenerator, TestEnvironment } from './helpers/mock-generators';

describe('groupBy _count typing', () => {
  it('emits _count as z.literal(true) | CountAggregateInput (no boolean false)', async () => {
    const env = await TestEnvironment.createTestEnv('groupby-count-literal');
    try {
      const schema = PrismaSchemaGenerator.createBasicSchema({
        models: ['User'],
        provider: 'sqlite',
        outputPath: join(env.outputDir, 'schemas'),
      });
      // write prisma schema file
      const { writeFileSync } = await import('fs');
      writeFileSync(env.schemaPath, schema);

      // run generation
      await env.runGeneration();

      // inspect generated groupBy schema for User
      const groupByPath = join(env.outputDir, 'schemas', 'groupByUser.schema.ts');
      expect(existsSync(groupByPath)).toBe(true);
      const content = readFileSync(groupByPath, 'utf-8');

      // Ensure no z.boolean() in _count and literal(true) is present
      expect(content).toContain(
        '_count: z.union([ z.literal(true), UserCountAggregateInputObjectSchema ])',
      );
      expect(content).not.toContain('_count: z.union([z.boolean()');

      // quick runtime smoke via dynamic import of compiled JS is heavy here; rely on content assertion
    } finally {
      await env.cleanup();
    }
  });
});
