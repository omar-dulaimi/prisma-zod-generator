import { z } from 'zod';
export const UserFindManyResultSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      email: z.string(),
      name: z.string().optional(),
      password: z.string(),
      role: z.unknown(),
      isActive: z.boolean(),
      createdAt: z.date(),
      posts: z.unknown(),
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
