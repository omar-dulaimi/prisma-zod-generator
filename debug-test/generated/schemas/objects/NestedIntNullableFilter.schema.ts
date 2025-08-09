import { z } from 'zod';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    equals: z.number().int().optional().nullable(),
    in: z.number().int().array().optional().nullable(),
    notIn: z.number().int().array().optional().nullable(),
    lt: z.number().int().optional(),
    lte: z.number().int().optional(),
    gt: z.number().int().optional(),
    gte: z.number().int().optional(),
    not: z
      .union([
        z.number().int(),
        z.lazy(() => NestedIntNullableFilterObjectSchema),
      ])
      .optional()
      .nullable(),
  })
  .strict();

export const NestedIntNullableFilterObjectSchema = Schema;
