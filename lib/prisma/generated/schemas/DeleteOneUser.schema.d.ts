import { z } from 'zod';
export declare const UserDeleteOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    where: z.ZodType<import(".prisma/client").Prisma.UserWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereUniqueInput>;
}, "strip", z.ZodTypeAny, {
    where: import(".prisma/client").Prisma.UserWhereUniqueInput;
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    where: import(".prisma/client").Prisma.UserWhereUniqueInput;
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
