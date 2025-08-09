import { z } from 'zod';
export const UserCountResultSchema = z.object({
  posts: z.number(),
});
