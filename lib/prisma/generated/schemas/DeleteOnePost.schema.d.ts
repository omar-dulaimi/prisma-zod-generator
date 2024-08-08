import { z } from 'zod';
export declare const PostDeleteOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    where: z.ZodType<import(".prisma/client").Prisma.PostWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereUniqueInput>;
}, "strip", z.ZodTypeAny, {
    where: import(".prisma/client").Prisma.PostWhereUniqueInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    where: import(".prisma/client").Prisma.PostWhereUniqueInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
