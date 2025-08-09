import { z } from 'zod';
import { PostSelectObjectSchema } from './objects/PostSelect.schema.js';
import { PostIncludeObjectSchema } from './objects/PostInclude.schema.js';
import { PostWhereUniqueInputObjectSchema } from './objects/PostWhereUniqueInput.schema';

export const PostFindUniqueSchema = z.object({
  select: PostSelectObjectSchema.optional(),
  include: PostIncludeObjectSchema.optional(),
  where: PostWhereUniqueInputObjectSchema,
});
