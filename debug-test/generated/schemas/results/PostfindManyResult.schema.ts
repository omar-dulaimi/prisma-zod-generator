import { z } from 'zod';
export const PostFindManyResultSchema = z.object({
  data: z.array(
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
  ),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});
