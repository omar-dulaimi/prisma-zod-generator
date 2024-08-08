import { z } from 'zod';
export declare const MapGroupBySchema: z.ZodObject<{
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereInput>>;
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapOrderByWithAggregationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapOrderByWithAggregationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.MapOrderByWithAggregationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapOrderByWithAggregationInput>, "many">]>>;
    having: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapScalarWhereWithAggregatesInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapScalarWhereWithAggregatesInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    by: z.ZodArray<z.ZodEnum<["key", "value"]>, "many">;
}, "strip", z.ZodTypeAny, {
    by: ("value" | "key")[];
    orderBy?: import(".prisma/client").Prisma.MapOrderByWithAggregationInput | import(".prisma/client").Prisma.MapOrderByWithAggregationInput[] | undefined;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    having?: import(".prisma/client").Prisma.MapScalarWhereWithAggregatesInput | undefined;
}, {
    by: ("value" | "key")[];
    orderBy?: import(".prisma/client").Prisma.MapOrderByWithAggregationInput | import(".prisma/client").Prisma.MapOrderByWithAggregationInput[] | undefined;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    having?: import(".prisma/client").Prisma.MapScalarWhereWithAggregatesInput | undefined;
}>;
