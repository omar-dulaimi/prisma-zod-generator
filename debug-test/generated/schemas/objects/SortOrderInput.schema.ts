import { z } from 'zod';
import { SortOrderSchema } from '../enums/SortOrder.schema';
import { NullsOrderSchema } from '../enums/NullsOrder.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    sort: SortOrderSchema,
    nulls: NullsOrderSchema.optional(),
  })
  .strict();

export const SortOrderInputObjectSchema = Schema;
