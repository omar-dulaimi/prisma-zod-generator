import { z } from 'zod';
export declare const PostUpdateOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUpdateInput>, z.ZodType<import(".prisma/client").Prisma.PostUncheckedUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUncheckedUpdateInput>]>;
    where: z.ZodType<import(".prisma/client").Prisma.PostWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereUniqueInput>;
}, "strip", z.ZodTypeAny, {
    where: import(".prisma/client").Prisma.PostWhereUniqueInput;
    data: import(".prisma/client").Prisma.PostUpdateInput | import(".prisma/client").Prisma.PostUncheckedUpdateInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    where: import(".prisma/client").Prisma.PostWhereUniqueInput;
    data: import(".prisma/client").Prisma.PostUpdateInput | import(".prisma/client").Prisma.PostUncheckedUpdateInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
