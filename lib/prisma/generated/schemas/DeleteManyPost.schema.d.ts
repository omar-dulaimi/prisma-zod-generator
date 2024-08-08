import { z } from 'zod';
export declare const PostDeleteManySchema: z.ZodObject<{
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereInput>>;
}, "strip", z.ZodTypeAny, {
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
}, {
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
}>;
