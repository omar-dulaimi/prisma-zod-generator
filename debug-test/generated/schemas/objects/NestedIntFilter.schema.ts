import { z } from 'zod';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    equals: z.number().int().optional(),
    in: z.number().int().array().optional(),
    notIn: z.number().int().array().optional(),
    lt: z.number().int().optional(),
    lte: z.number().int().optional(),
    gt: z.number().int().optional(),
    gte: z.number().int().optional(),
    not: z
      .union([z.number().int(), z.lazy(() => NestedIntFilterObjectSchema)])
      .optional(),
  })
  .strict();

export const NestedIntFilterObjectSchema = Schema;
