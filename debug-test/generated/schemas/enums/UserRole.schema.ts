import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'USER', 'MODERATOR']);
