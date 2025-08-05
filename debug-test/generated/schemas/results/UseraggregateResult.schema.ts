import { z } from 'zod';
export const UserAggregateResultSchema = z.object({
  _count: z.number(),
  _sum: z
    .object({
      id: z.number().nullable(),
    })
    .nullable(),
  _avg: z
    .object({
      id: z.number().nullable(),
    })
    .nullable(),
  _min: z
    .object({
      id: z.number().int().nullable(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      password: z.string().nullable(),
      createdAt: z.date().nullable(),
    })
    .nullable(),
  _max: z
    .object({
      id: z.number().int().nullable(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      password: z.string().nullable(),
      createdAt: z.date().nullable(),
    })
    .nullable(),
});
