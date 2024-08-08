import { z } from 'zod';
export declare const PostUpdateManySchema: z.ZodObject<{
    data: z.ZodType<import(".prisma/client").Prisma.PostUpdateManyMutationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUpdateManyMutationInput>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereInput>>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.PostUpdateManyMutationInput;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
}, {
    data: import(".prisma/client").Prisma.PostUpdateManyMutationInput;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
}>;
