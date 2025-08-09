import { z } from 'zod';
import { PostCreateWithoutAuthorInputObjectSchema } from './PostCreateWithoutAuthorInput.schema';
import { PostUncheckedCreateWithoutAuthorInputObjectSchema } from './PostUncheckedCreateWithoutAuthorInput.schema';
import { PostCreateOrConnectWithoutAuthorInputObjectSchema } from './PostCreateOrConnectWithoutAuthorInput.schema';
import { PostCreateManyAuthorInputEnvelopeObjectSchema } from './PostCreateManyAuthorInputEnvelope.schema';
import { PostWhereUniqueInputObjectSchema } from './PostWhereUniqueInput.schema';

import type { Prisma } from '@prisma/client';

const Schema: z.ZodType<any> = z
  .object({
    create: z
      .union([
        z.lazy(() => PostCreateWithoutAuthorInputObjectSchema),
        z.lazy(() => PostCreateWithoutAuthorInputObjectSchema).array(),
        z.lazy(() => PostUncheckedCreateWithoutAuthorInputObjectSchema),
        z.lazy(() => PostUncheckedCreateWithoutAuthorInputObjectSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([
        z.lazy(() => PostCreateOrConnectWithoutAuthorInputObjectSchema),
        z.lazy(() => PostCreateOrConnectWithoutAuthorInputObjectSchema).array(),
      ])
      .optional(),
    createMany: z
      .lazy(() => PostCreateManyAuthorInputEnvelopeObjectSchema)
      .optional(),
    connect: z
      .union([
        z.lazy(() => PostWhereUniqueInputObjectSchema),
        z.lazy(() => PostWhereUniqueInputObjectSchema).array(),
      ])
      .optional(),
  })
  .strict();

export const PostCreateNestedManyWithoutAuthorInputObjectSchema = Schema;
