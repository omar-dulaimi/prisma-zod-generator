import { z } from 'zod';
import { PostSelectObjectSchema } from './PostSelect.schema';
import { PostIncludeObjectSchema } from './PostInclude.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    select: z.lazy(() => PostSelectObjectSchema).optional(),
    include: z.lazy(() => PostIncludeObjectSchema).optional(),
  })
  .strict();

export const PostArgsObjectSchema = Schema;
