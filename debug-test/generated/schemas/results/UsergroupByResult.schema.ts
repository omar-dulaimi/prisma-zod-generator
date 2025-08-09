import { z } from 'zod';
export const UserGroupByResultSchema = z.array(
  z.object({
    id: z.number().int(),
    email: z.string(),
    name: z.string(),
    password: z.string(),
    isActive: z.boolean(),
    createdAt: z.date(),
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
  }),
);
