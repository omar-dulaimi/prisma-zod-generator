import { z } from 'zod';
export declare const PostAggregateSchema: z.ZodObject<{
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostOrderByWithRelationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.PostOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostOrderByWithRelationInput>, "many">]>>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereInput>>;
    cursor: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereUniqueInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    _count: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<true>, z.ZodType<import(".prisma/client").Prisma.PostCountAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.PostCountAggregateInputType>]>>;
    _min: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostMinAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.PostMinAggregateInputType>>;
    _max: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostMaxAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.PostMaxAggregateInputType>>;
    _avg: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostAvgAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.PostAvgAggregateInputType>>;
    _sum: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostSumAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.PostSumAggregateInputType>>;
}, "strip", z.ZodTypeAny, {
    _count?: true | import(".prisma/client").Prisma.PostCountAggregateInputType | undefined;
    orderBy?: import(".prisma/client").Prisma.PostOrderByWithRelationInput | import(".prisma/client").Prisma.PostOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.PostWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    _min?: import(".prisma/client").Prisma.PostMinAggregateInputType | undefined;
    _max?: import(".prisma/client").Prisma.PostMaxAggregateInputType | undefined;
    _avg?: import(".prisma/client").Prisma.PostAvgAggregateInputType | undefined;
    _sum?: import(".prisma/client").Prisma.PostSumAggregateInputType | undefined;
}, {
    _count?: true | import(".prisma/client").Prisma.PostCountAggregateInputType | undefined;
    orderBy?: import(".prisma/client").Prisma.PostOrderByWithRelationInput | import(".prisma/client").Prisma.PostOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.PostWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    _min?: import(".prisma/client").Prisma.PostMinAggregateInputType | undefined;
    _max?: import(".prisma/client").Prisma.PostMaxAggregateInputType | undefined;
    _avg?: import(".prisma/client").Prisma.PostAvgAggregateInputType | undefined;
    _sum?: import(".prisma/client").Prisma.PostSumAggregateInputType | undefined;
}>;
