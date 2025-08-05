import { z } from 'zod';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { PostUncheckedCreateNestedManyWithoutAuthorInputObjectSchema } from './PostUncheckedCreateNestedManyWithoutAuthorInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    name: z.string().optional().nullable(),
    role: UserRoleSchema.optional(),
    isActive: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    posts: z
      .lazy(() => PostUncheckedCreateNestedManyWithoutAuthorInputObjectSchema)
      .optional(),
  })
  .strict();

export const UserUncheckedCreateInputObjectSchema = Schema;
