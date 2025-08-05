import { z } from 'zod';
import { PostWhereInputObjectSchema } from './PostWhereInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    every: z.lazy(() => PostWhereInputObjectSchema).optional(),
    some: z.lazy(() => PostWhereInputObjectSchema).optional(),
    none: z.lazy(() => PostWhereInputObjectSchema).optional(),
  })
  .strict();

export const PostListRelationFilterObjectSchema = Schema;
