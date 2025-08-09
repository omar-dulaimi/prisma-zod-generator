import { z } from 'zod';
import { UserWhereInputObjectSchema } from './UserWhereInput.schema';
import { UserUpdateWithoutPostsInputObjectSchema } from './UserUpdateWithoutPostsInput.schema';
import { UserUncheckedUpdateWithoutPostsInputObjectSchema } from './UserUncheckedUpdateWithoutPostsInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    where: z.lazy(() => UserWhereInputObjectSchema).optional(),
    data: z.union([
      z.lazy(() => UserUpdateWithoutPostsInputObjectSchema),
      z.lazy(() => UserUncheckedUpdateWithoutPostsInputObjectSchema),
    ]),
  })
  .strict();

export const UserUpdateToOneWithWhereWithoutPostsInputObjectSchema = Schema;
