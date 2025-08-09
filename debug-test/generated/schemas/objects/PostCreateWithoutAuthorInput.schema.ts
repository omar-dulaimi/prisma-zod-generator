import { z } from 'zod';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    title: z.string(),
    content: z.string().optional().nullable(),
    published: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
  })
  .strict();

export const PostCreateWithoutAuthorInputObjectSchema = Schema;
