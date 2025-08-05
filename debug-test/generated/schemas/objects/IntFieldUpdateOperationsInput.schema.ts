import { z } from 'zod';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    set: z.number().int().optional(),
    increment: z.number().int().optional(),
    decrement: z.number().int().optional(),
    multiply: z.number().int().optional(),
    divide: z.number().int().optional(),
  })
  .strict();

export const IntFieldUpdateOperationsInputObjectSchema = Schema;
