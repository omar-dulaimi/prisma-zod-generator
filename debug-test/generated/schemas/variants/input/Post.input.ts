import { z } from 'zod';

export const PostInputSchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    content: z.string().optional().nullable(),
    published: z.boolean(),
    createdAt: z.date(),
    author: z.unknown(),
    authorId: z.number().int(),
  })
  .strict();

export type PostInputType = z.infer<typeof PostInputSchema>;
