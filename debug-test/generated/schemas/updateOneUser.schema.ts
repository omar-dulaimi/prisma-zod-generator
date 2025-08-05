import { z } from 'zod';
import { UserSelectObjectSchema } from './objects/UserSelect.schema.js';
import { UserIncludeObjectSchema } from './objects/UserInclude.schema.js';
import { UserUpdateInputObjectSchema } from './objects/UserUpdateInput.schema';
import { UserUncheckedUpdateInputObjectSchema } from './objects/UserUncheckedUpdateInput.schema';
import { UserWhereUniqueInputObjectSchema } from './objects/UserWhereUniqueInput.schema';

export const UserUpdateOneSchema = z.object({
  select: UserSelectObjectSchema.optional(),
  include: UserIncludeObjectSchema.optional(),
  data: z.union([
    UserUpdateInputObjectSchema,
    UserUncheckedUpdateInputObjectSchema,
  ]),
  where: UserWhereUniqueInputObjectSchema,
});
