import { z } from 'zod';
export declare const UserAggregateSchema: z.ZodObject<{
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserOrderByWithRelationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.UserOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserOrderByWithRelationInput>, "many">]>>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereInput>>;
    cursor: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereUniqueInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    _count: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<true>, z.ZodType<import(".prisma/client").Prisma.UserCountAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.UserCountAggregateInputType>]>>;
    _min: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserMinAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.UserMinAggregateInputType>>;
    _max: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserMaxAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.UserMaxAggregateInputType>>;
    _avg: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserAvgAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.UserAvgAggregateInputType>>;
    _sum: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserSumAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.UserSumAggregateInputType>>;
}, "strip", z.ZodTypeAny, {
    _count?: true | import(".prisma/client").Prisma.UserCountAggregateInputType | undefined;
    orderBy?: import(".prisma/client").Prisma.UserOrderByWithRelationInput | import(".prisma/client").Prisma.UserOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.UserWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    _min?: import(".prisma/client").Prisma.UserMinAggregateInputType | undefined;
    _max?: import(".prisma/client").Prisma.UserMaxAggregateInputType | undefined;
    _avg?: import(".prisma/client").Prisma.UserAvgAggregateInputType | undefined;
    _sum?: import(".prisma/client").Prisma.UserSumAggregateInputType | undefined;
}, {
    _count?: true | import(".prisma/client").Prisma.UserCountAggregateInputType | undefined;
    orderBy?: import(".prisma/client").Prisma.UserOrderByWithRelationInput | import(".prisma/client").Prisma.UserOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.UserWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    _min?: import(".prisma/client").Prisma.UserMinAggregateInputType | undefined;
    _max?: import(".prisma/client").Prisma.UserMaxAggregateInputType | undefined;
    _avg?: import(".prisma/client").Prisma.UserAvgAggregateInputType | undefined;
    _sum?: import(".prisma/client").Prisma.UserSumAggregateInputType | undefined;
}>;
