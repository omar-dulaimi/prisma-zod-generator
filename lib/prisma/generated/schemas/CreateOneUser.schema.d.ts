import { z } from 'zod';
export declare const UserCreateOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserCreateInput>, z.ZodType<import(".prisma/client").Prisma.UserUncheckedCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserUncheckedCreateInput>]>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.UserCreateInput | import(".prisma/client").Prisma.UserUncheckedCreateInput;
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    data: import(".prisma/client").Prisma.UserCreateInput | import(".prisma/client").Prisma.UserUncheckedCreateInput;
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
