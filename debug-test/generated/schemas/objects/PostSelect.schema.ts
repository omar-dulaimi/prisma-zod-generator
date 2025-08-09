import { z } from 'zod';
import { UserArgsObjectSchema } from './UserArgs.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    id: z.boolean().optional(),
    title: z.boolean().optional(),
    content: z.boolean().optional(),
    published: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    author: z
      .union([z.boolean(), z.lazy(() => UserArgsObjectSchema)])
      .optional(),
    authorId: z.boolean().optional(),
  })
  .strict();

export const PostSelectObjectSchema = Schema;
