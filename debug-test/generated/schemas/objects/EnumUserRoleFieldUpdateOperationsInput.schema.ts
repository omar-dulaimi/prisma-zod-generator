import { z } from 'zod';
import { UserRoleSchema } from '../enums/UserRole.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    set: UserRoleSchema.optional(),
  })
  .strict();

export const EnumUserRoleFieldUpdateOperationsInputObjectSchema = Schema;
