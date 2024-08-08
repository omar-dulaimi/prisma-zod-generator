import { z } from 'zod';
export declare const MapFindManySchema: z.ZodObject<{
    select: z.ZodLazy<z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>>>>;
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapOrderByWithRelationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.MapOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapOrderByWithRelationInput>, "many">]>>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereInput>>;
    cursor: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereUniqueInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    distinct: z.ZodOptional<z.ZodArray<z.ZodEnum<["key", "value"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    orderBy?: import(".prisma/client").Prisma.MapOrderByWithRelationInput | import(".prisma/client").Prisma.MapOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.MapWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    distinct?: ("value" | "key")[] | undefined;
}, {
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    orderBy?: import(".prisma/client").Prisma.MapOrderByWithRelationInput | import(".prisma/client").Prisma.MapOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.MapWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    distinct?: ("value" | "key")[] | undefined;
}>;
