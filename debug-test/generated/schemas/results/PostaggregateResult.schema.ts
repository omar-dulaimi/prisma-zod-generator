import { z } from 'zod';
export const PostAggregateResultSchema = z.object({
  _count: z.number(),
  _sum: z
    .object({
      id: z.number().nullable(),
      views: z.number().nullable(),
      authorId: z.number().nullable(),
    })
    .nullable(),
  _avg: z
    .object({
      id: z.number().nullable(),
      views: z.number().nullable(),
      authorId: z.number().nullable(),
    })
    .nullable(),
  _min: z
    .object({
      id: z.number().int().nullable(),
      title: z.string().nullable(),
      content: z.string().nullable(),
      views: z.number().int().nullable(),
      createdAt: z.date().nullable(),
      authorId: z.number().int().nullable(),
    })
    .nullable(),
  _max: z
    .object({
      id: z.number().int().nullable(),
      title: z.string().nullable(),
      content: z.string().nullable(),
      views: z.number().int().nullable(),
      createdAt: z.date().nullable(),
      authorId: z.number().int().nullable(),
    })
    .nullable(),
});
