import { z } from 'zod';
export const UserDeleteResultSchema = z.nullable(
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
);
