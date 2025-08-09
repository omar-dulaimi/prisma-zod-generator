import { z } from 'zod';
export const PostCreateManyResultSchema = z.object({
  count: z.number(),
});
