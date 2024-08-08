import { z } from 'zod';
export declare const PostCreateManySchema: z.ZodObject<{
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostCreateManyInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostCreateManyInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.PostCreateManyInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostCreateManyInput>, "many">]>;
    skipDuplicates: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.PostCreateManyInput | import(".prisma/client").Prisma.PostCreateManyInput[];
    skipDuplicates?: boolean | undefined;
}, {
    data: import(".prisma/client").Prisma.PostCreateManyInput | import(".prisma/client").Prisma.PostCreateManyInput[];
    skipDuplicates?: boolean | undefined;
}>;
