import { z } from 'zod';
import { UserWhereInputObjectSchema } from './UserWhereInput.schema';
import { StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { EnumUserRoleFilterObjectSchema } from './EnumUserRoleFilter.schema';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { BoolFilterObjectSchema } from './BoolFilter.schema';
import { DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { PostListRelationFilterObjectSchema } from './PostListRelationFilter.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<Prisma.UserWhereUniqueInput> = z
  .object({
    id: z.number().int(),
    email: z.string(),
    AND: z
      .union([
        z.lazy(() => UserWhereInputObjectSchema),
        z.lazy(() => UserWhereInputObjectSchema).array(),
      ])
      .optional(),
    OR: z
      .lazy(() => UserWhereInputObjectSchema)
      .array()
      .optional(),
    NOT: z
      .union([
        z.lazy(() => UserWhereInputObjectSchema),
        z.lazy(() => UserWhereInputObjectSchema).array(),
      ])
      .optional(),
    name: z
      .union([z.lazy(() => StringNullableFilterObjectSchema), z.string()])
      .optional()
      .nullable(),
    role: z
      .union([z.lazy(() => EnumUserRoleFilterObjectSchema), UserRoleSchema])
      .optional(),
    isActive: z
      .union([z.lazy(() => BoolFilterObjectSchema), z.boolean()])
      .optional(),
    createdAt: z
      .union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()])
      .optional(),
    posts: z.lazy(() => PostListRelationFilterObjectSchema).optional(),
  })
  .strict();

export const UserWhereUniqueInputObjectSchema = Schema;
