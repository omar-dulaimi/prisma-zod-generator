import { z } from 'zod';
export const UserDeleteManyResultSchema = z.object({
  count: z.number(),
});
