import { z } from 'zod';
export const UserCreateManyResultSchema = z.object({
  count: z.number(),
});
