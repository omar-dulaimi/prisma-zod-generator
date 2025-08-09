import { z } from 'zod';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { PostCreateNestedManyWithoutAuthorInputObjectSchema } from './PostCreateNestedManyWithoutAuthorInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    email: z.string(),
    name: z.string().optional().nullable(),
    role: UserRoleSchema.optional(),
    isActive: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    posts: z
      .lazy(() => PostCreateNestedManyWithoutAuthorInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserCreateInputObjectSchema = Schema;
