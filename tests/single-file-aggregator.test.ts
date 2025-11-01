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
});
