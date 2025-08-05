import { z } from 'zod';
export const PostDeleteResultSchema = z.nullable(
  z.object({
    id: z.number().int(),
    title: z.string(),
    content: z.string().optional(),
    views: z.number().int(),
    published: z.boolean(),
    createdAt: z.date(),
    author: z.unknown(),
    authorId: z.number().int(),
  }),
);
