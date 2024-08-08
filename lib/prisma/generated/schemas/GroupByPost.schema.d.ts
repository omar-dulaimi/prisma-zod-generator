import { z } from 'zod';
export declare const PostGroupBySchema: z.ZodObject<{
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereInput>>;
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostOrderByWithAggregationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostOrderByWithAggregationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.PostOrderByWithAggregationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostOrderByWithAggregationInput>, "many">]>>;
    having: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostScalarWhereWithAggregatesInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostScalarWhereWithAggregatesInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    by: z.ZodArray<z.ZodEnum<["id", "createdAt", "updatedAt", "title", "content", "published", "viewCount", "authorId", "likes", "bytes"]>, "many">;
}, "strip", z.ZodTypeAny, {
    by: ("id" | "createdAt" | "updatedAt" | "title" | "content" | "published" | "viewCount" | "authorId" | "likes" | "bytes")[];
    orderBy?: import(".prisma/client").Prisma.PostOrderByWithAggregationInput | import(".prisma/client").Prisma.PostOrderByWithAggregationInput[] | undefined;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    having?: import(".prisma/client").Prisma.PostScalarWhereWithAggregatesInput | undefined;
}, {
    by: ("id" | "createdAt" | "updatedAt" | "title" | "content" | "published" | "viewCount" | "authorId" | "likes" | "bytes")[];
    orderBy?: import(".prisma/client").Prisma.PostOrderByWithAggregationInput | import(".prisma/client").Prisma.PostOrderByWithAggregationInput[] | undefined;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    having?: import(".prisma/client").Prisma.PostScalarWhereWithAggregatesInput | undefined;
}>;
