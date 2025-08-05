import { z } from 'zod';
import { UserCreateManyInputObjectSchema } from './objects/UserCreateManyInput.schema';

export const UserCreateManySchema = z.object({
  data: z.union([
    UserCreateManyInputObjectSchema,
    z.array(UserCreateManyInputObjectSchema),
  ]),
});
