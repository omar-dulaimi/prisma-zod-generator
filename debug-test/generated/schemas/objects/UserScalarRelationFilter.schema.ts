import { z } from 'zod';
import { UserWhereInputObjectSchema } from './UserWhereInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    is: z.lazy(() => UserWhereInputObjectSchema).optional(),
    isNot: z.lazy(() => UserWhereInputObjectSchema).optional(),
  })
  .strict();

export const UserScalarRelationFilterObjectSchema = Schema;
