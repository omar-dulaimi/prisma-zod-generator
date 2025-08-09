import { z } from 'zod';

export const PostModelSchema = z
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

export type PostModelType = z.infer<typeof PostModelSchema>;
