import { z } from 'zod';

export const PostScalarFieldEnumSchema = z.enum([
  'id',
  'title',
  'content',
  'views',
  'published',
  'createdAt',
  'authorId',
]);
