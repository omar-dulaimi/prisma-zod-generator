import { z } from 'zod';
import { PostFindManySchema } from '../findManyPost.schema';
import { UserCountOutputTypeArgsObjectSchema } from './UserCountOutputTypeArgs.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    id: z.boolean().optional(),
    email: z.boolean().optional(),
    name: z.boolean().optional(),
    role: z.boolean().optional(),
    isActive: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    posts: z.union([z.boolean(), z.lazy(() => PostFindManySchema)]).optional(),
    _count: z
      .union([z.boolean(), z.lazy(() => UserCountOutputTypeArgsObjectSchema)])
      .optional(),
  })
  .strict();

export const UserSelectObjectSchema = Schema;
