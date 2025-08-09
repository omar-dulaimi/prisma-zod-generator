import { z } from 'zod';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { NestedEnumUserRoleFilterObjectSchema } from './NestedEnumUserRoleFilter.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    equals: UserRoleSchema.optional(),
    in: UserRoleSchema.array().optional(),
    notIn: UserRoleSchema.array().optional(),
    not: z
      .union([
        UserRoleSchema,
        z.lazy(() => NestedEnumUserRoleFilterObjectSchema),
      ])
      .optional(),
  })
  .strict();

export const EnumUserRoleFilterObjectSchema = Schema;
