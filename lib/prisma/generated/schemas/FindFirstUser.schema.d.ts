import { z } from 'zod';
export declare const UserFindFirstSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    include: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs>>>;
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserOrderByWithRelationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.UserOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserOrderByWithRelationInput>, "many">]>>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereInput>>;
    cursor: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereUniqueInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    distinct: z.ZodOptional<z.ZodArray<z.ZodEnum<["id", "email", "name"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    orderBy?: import(".prisma/client").Prisma.UserOrderByWithRelationInput | import(".prisma/client").Prisma.UserOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.UserWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    distinct?: ("name" | "id" | "email")[] | undefined;
}, {
    select?: import(".prisma/client").Prisma.UserSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.UserInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    orderBy?: import(".prisma/client").Prisma.UserOrderByWithRelationInput | import(".prisma/client").Prisma.UserOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.UserWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    distinct?: ("name" | "id" | "email")[] | undefined;
}>;
