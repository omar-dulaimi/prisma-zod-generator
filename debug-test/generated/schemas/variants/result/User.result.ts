import { z } from 'zod';

export const UserResultSchema = z
  .object({
    id: z.number().int(),
    email: z.string(),
    name: z.string().nullable(),
    role: z.enum(UserRole),
    isActive: z.boolean(),
    createdAt: z.date(),
    posts: z.unknown(),
  })
  .strict();

export type UserResultType = z.infer<typeof UserResultSchema>;
