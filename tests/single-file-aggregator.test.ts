import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, it } from 'vitest';
import {
  appendSingleFile,
  flushSingleFile,
  initSingleFile,
} from '../src/utils/singleFileAggregator';

describe('singleFileAggregator', () => {
  it('renames conflicting pure model inferred types to avoid duplicate identifiers', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pzg-single-file-'));
    const bundlePath = join(dir, 'schemas', 'index.ts');

    try {
      initSingleFile(bundlePath);

      appendSingleFile(
        'src/schemas/enums/PurchaseType.schema.ts',
        `
import * as z from 'zod';

export const PurchaseTypeSchema = z.enum(['SUBSCRIPTION', 'ONE_TIME']);

export type PurchaseType = z.infer<typeof PurchaseTypeSchema>;
`.trim(),
      );

      appendSingleFile(
        'src/schemas/models/Purchase.schema.ts',
        `
import * as z from 'zod';
import { PurchaseTypeSchema } from '../enums/PurchaseType.schema';

export const PurchaseSchema = z.object({
  type: PurchaseTypeSchema,
});

export type PurchaseType = z.infer<typeof PurchaseSchema>;
`.trim(),
      );

      await flushSingleFile();

      const content = readFileSync(bundlePath, 'utf-8');

      expect(content).toMatch(/export type PurchaseType = z\.infer<typeof PurchaseTypeSchema>;/);
      expect(content).toMatch(/export type PurchaseModel = z\.infer<typeof PurchaseSchema>;/);
      expect(content).not.toMatch(/export type PurchaseType = z\.infer<typeof PurchaseSchema>;/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should not duplicate literalSchema and jsonSchema definitions in single file mode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pzg-single-file-json-'));
    const bundlePath = join(dir, 'schemas', 'index.ts');

    try {
      initSingleFile(bundlePath);

      // First schema with JSON field (inline helpers in minimal mode)
      appendSingleFile(
        'src/schemas/objects/UserCreateInput.schema.ts',
        `
import * as z from 'zod';

const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: any = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(z.string(), jsonSchema.nullable())])
);

export const UserCreateInputObjectSchema = z.object({
  name: z.string(),
  metadata: z.union([jsonSchema]),
});
`.trim(),
      );

      // Second schema with JSON field (inline helpers in minimal mode)
      appendSingleFile(
        'src/schemas/objects/PostCreateInput.schema.ts',
        `
import * as z from 'zod';

const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: any = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(z.string(), jsonSchema.nullable())])
);

export const PostCreateInputObjectSchema = z.object({
  title: z.string(),
  data: z.union([jsonSchema]),
});
`.trim(),
      );

      await flushSingleFile();

      const content = readFileSync(bundlePath, 'utf-8');

      // Count occurrences of literalSchema definition
      const literalSchemaMatches = content.match(
        /const literalSchema = z\.union\(\[z\.string\(\), z\.number\(\), z\.boolean\(\)\]\);/g,
      );
      expect(literalSchemaMatches).toHaveLength(1);

      // Count occurrences of jsonSchema definition
      const jsonSchemaMatches = content.match(/const jsonSchema: any = z\.lazy\(\(\) =>/g);
      expect(jsonSchemaMatches).toHaveLength(1);

      // Verify both schemas are present
      expect(content).toContain('UserCreateInputObjectSchema');
      expect(content).toContain('PostCreateInputObjectSchema');

      // Verify the hoisted helpers are at the top
      const literalSchemaIndex = content.indexOf('const literalSchema');
      const userSchemaIndex = content.indexOf('UserCreateInputObjectSchema');
      const postSchemaIndex = content.indexOf('PostCreateInputObjectSchema');

      expect(literalSchemaIndex).toBeLessThan(userSchemaIndex);
      expect(literalSchemaIndex).toBeLessThan(postSchemaIndex);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
