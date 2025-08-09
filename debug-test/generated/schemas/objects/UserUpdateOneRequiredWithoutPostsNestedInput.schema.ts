import { z } from 'zod';
import { UserCreateWithoutPostsInputObjectSchema } from './UserCreateWithoutPostsInput.schema';
import { UserUncheckedCreateWithoutPostsInputObjectSchema } from './UserUncheckedCreateWithoutPostsInput.schema';
import { UserCreateOrConnectWithoutPostsInputObjectSchema } from './UserCreateOrConnectWithoutPostsInput.schema';
import { UserUpsertWithoutPostsInputObjectSchema } from './UserUpsertWithoutPostsInput.schema';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';
import { UserUpdateToOneWithWhereWithoutPostsInputObjectSchema } from './UserUpdateToOneWithWhereWithoutPostsInput.schema';
import { UserUpdateWithoutPostsInputObjectSchema } from './UserUpdateWithoutPostsInput.schema';
import { UserUncheckedUpdateWithoutPostsInputObjectSchema } from './UserUncheckedUpdateWithoutPostsInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    create: z
      .union([
        z.lazy(() => UserCreateWithoutPostsInputObjectSchema),
        z.lazy(() => UserUncheckedCreateWithoutPostsInputObjectSchema),
      ])
      .optional(),
    connectOrCreate: z
      .lazy(() => UserCreateOrConnectWithoutPostsInputObjectSchema)
      .optional(),
    upsert: z.lazy(() => UserUpsertWithoutPostsInputObjectSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputObjectSchema).optional(),
    update: z
      .union([
        z.lazy(() => UserUpdateToOneWithWhereWithoutPostsInputObjectSchema),
        z.lazy(() => UserUpdateWithoutPostsInputObjectSchema),
        z.lazy(() => UserUncheckedUpdateWithoutPostsInputObjectSchema),
      ])
      .optional(),
  })
  .strict();

export const UserUpdateOneRequiredWithoutPostsNestedInputObjectSchema = Schema;
