import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    _count: SortOrderSchema.optional(),
  })
  .strict();

export const PostOrderByRelationAggregateInputObjectSchema = Schema;
