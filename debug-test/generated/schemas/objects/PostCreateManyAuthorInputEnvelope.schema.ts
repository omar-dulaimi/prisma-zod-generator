import { z } from 'zod';
import { PostCreateManyAuthorInputObjectSchema } from './PostCreateManyAuthorInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    data: z.union([
      z.lazy(() => PostCreateManyAuthorInputObjectSchema),
      z.lazy(() => PostCreateManyAuthorInputObjectSchema).array(),
    ]),
  })
  .strict();

export const PostCreateManyAuthorInputEnvelopeObjectSchema = Schema;
