import { z } from 'zod';

export const PostResultSchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    content: z.string().nullable(),
    published: z.boolean(),
    createdAt: z.date(),
    author: z.unknown(),
    authorId: z.number().int(),
  })
  .strict();

export type PostResultType = z.infer<typeof PostResultSchema>;
