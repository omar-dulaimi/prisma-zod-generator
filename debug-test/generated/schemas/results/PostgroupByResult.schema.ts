import { z } from 'zod';
export const PostGroupByResultSchema = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    content: z.string(),
    views: z.number().int(),
    published: z.boolean(),
    createdAt: z.date(),
    authorId: z.number().int(),
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
  }),
);
