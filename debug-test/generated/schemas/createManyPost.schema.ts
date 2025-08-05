import { z } from 'zod';
import { PostCreateManyInputObjectSchema } from './objects/PostCreateManyInput.schema';

export const PostCreateManySchema = z.object({
  data: z.union([
    PostCreateManyInputObjectSchema,
    z.array(PostCreateManyInputObjectSchema),
  ]),
});
