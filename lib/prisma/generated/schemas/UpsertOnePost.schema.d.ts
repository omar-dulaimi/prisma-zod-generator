import { z } from 'zod';
export declare const PostUpsertSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    where: z.ZodType<import(".prisma/client").Prisma.PostWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereUniqueInput>;
    create: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostCreateInput>, z.ZodType<import(".prisma/client").Prisma.PostUncheckedCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUncheckedCreateInput>]>;
    update: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUpdateInput>, z.ZodType<import(".prisma/client").Prisma.PostUncheckedUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUncheckedUpdateInput>]>;
}, "strip", z.ZodTypeAny, {
    create: import(".prisma/client").Prisma.PostCreateInput | import(".prisma/client").Prisma.PostUncheckedCreateInput;
    update: import(".prisma/client").Prisma.PostUpdateInput | import(".prisma/client").Prisma.PostUncheckedUpdateInput;
    where: import(".prisma/client").Prisma.PostWhereUniqueInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    create: import(".prisma/client").Prisma.PostCreateInput | import(".prisma/client").Prisma.PostUncheckedCreateInput;
    update: import(".prisma/client").Prisma.PostUpdateInput | import(".prisma/client").Prisma.PostUncheckedUpdateInput;
    where: import(".prisma/client").Prisma.PostWhereUniqueInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
