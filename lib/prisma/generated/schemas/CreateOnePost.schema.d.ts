import { z } from 'zod';
export declare const PostCreateOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostCreateInput>, z.ZodType<import(".prisma/client").Prisma.PostUncheckedCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostUncheckedCreateInput>]>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.PostCreateInput | import(".prisma/client").Prisma.PostUncheckedCreateInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    data: import(".prisma/client").Prisma.PostCreateInput | import(".prisma/client").Prisma.PostUncheckedCreateInput;
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
