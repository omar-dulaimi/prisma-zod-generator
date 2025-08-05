import { z } from 'zod';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { NestedEnumUserRoleWithAggregatesFilterObjectSchema } from './NestedEnumUserRoleWithAggregatesFilter.schema';
import { NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
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
        z.lazy(() => NestedEnumUserRoleWithAggregatesFilterObjectSchema),
      ])
      .optional(),
    _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
    _min: z.lazy(() => NestedEnumUserRoleFilterObjectSchema).optional(),
    _max: z.lazy(() => NestedEnumUserRoleFilterObjectSchema).optional(),
  })
  .strict();

export const EnumUserRoleWithAggregatesFilterObjectSchema = Schema;
