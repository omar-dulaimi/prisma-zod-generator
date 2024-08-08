import { z } from 'zod';
export declare const MapAggregateSchema: z.ZodObject<{
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapOrderByWithRelationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.MapOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapOrderByWithRelationInput>, "many">]>>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereInput>>;
    cursor: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereUniqueInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    _count: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<true>, z.ZodType<import(".prisma/client").Prisma.MapCountAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.MapCountAggregateInputType>]>>;
    _min: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapMinAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.MapMinAggregateInputType>>;
    _max: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapMaxAggregateInputType, z.ZodTypeDef, import(".prisma/client").Prisma.MapMaxAggregateInputType>>;
}, "strip", z.ZodTypeAny, {
    _count?: true | import(".prisma/client").Prisma.MapCountAggregateInputType | undefined;
    orderBy?: import(".prisma/client").Prisma.MapOrderByWithRelationInput | import(".prisma/client").Prisma.MapOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.MapWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    _min?: import(".prisma/client").Prisma.MapMinAggregateInputType | undefined;
    _max?: import(".prisma/client").Prisma.MapMaxAggregateInputType | undefined;
}, {
    _count?: true | import(".prisma/client").Prisma.MapCountAggregateInputType | undefined;
    orderBy?: import(".prisma/client").Prisma.MapOrderByWithRelationInput | import(".prisma/client").Prisma.MapOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.MapWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    _min?: import(".prisma/client").Prisma.MapMinAggregateInputType | undefined;
    _max?: import(".prisma/client").Prisma.MapMaxAggregateInputType | undefined;
}>;
