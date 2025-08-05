import { z } from 'zod';
export const PostCountResultSchema = z.object({
  author: z.number(),
});
