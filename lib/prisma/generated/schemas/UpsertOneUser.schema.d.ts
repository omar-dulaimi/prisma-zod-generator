import { z } from 'zod';
export declare const UserUpsertSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    where: z.ZodType<import(".prisma/client").Prisma.UserWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereUniqueInput>;
    create: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserCreateInput>, z.ZodType<import(".prisma/client").Prisma.UserUncheckedCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserUncheckedCreateInput>]>;
    update: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserUpdateInput>, z.ZodType<import(".prisma/client").Prisma.UserUncheckedUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserUncheckedUpdateInput>]>;
}, "strip", z.ZodTypeAny, {
    create: import(".prisma/client").Prisma.UserCreateInput | import(".prisma/client").Prisma.UserUncheckedCreateInput;
    update: import(".prisma/client").Prisma.UserUpdateInput | import(".prisma/client").Prisma.UserUncheckedUpdateInput;
    where: import(".prisma/client").Prisma.UserWhereUniqueInput;
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    create: import(".prisma/client").Prisma.UserCreateInput | import(".prisma/client").Prisma.UserUncheckedCreateInput;
    update: import(".prisma/client").Prisma.UserUpdateInput | import(".prisma/client").Prisma.UserUncheckedUpdateInput;
    where: import(".prisma/client").Prisma.UserWhereUniqueInput;
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
