import { z } from 'zod';
export declare const UserGroupBySchema: z.ZodObject<{
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereInput>>;
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserOrderByWithAggregationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserOrderByWithAggregationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.UserOrderByWithAggregationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserOrderByWithAggregationInput>, "many">]>>;
    having: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserScalarWhereWithAggregatesInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserScalarWhereWithAggregatesInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    by: z.ZodArray<z.ZodEnum<["id", "email", "name"]>, "many">;
}, "strip", z.ZodTypeAny, {
    by: ("name" | "id" | "email")[];
    orderBy?: import(".prisma/client").Prisma.UserOrderByWithAggregationInput | import(".prisma/client").Prisma.UserOrderByWithAggregationInput[] | undefined;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    having?: import(".prisma/client").Prisma.UserScalarWhereWithAggregatesInput | undefined;
}, {
    by: ("name" | "id" | "email")[];
    orderBy?: import(".prisma/client").Prisma.UserOrderByWithAggregationInput | import(".prisma/client").Prisma.UserOrderByWithAggregationInput[] | undefined;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    having?: import(".prisma/client").Prisma.UserScalarWhereWithAggregatesInput | undefined;
}>;
