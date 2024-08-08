import { z } from 'zod';
export declare const PostFindManySchema: z.ZodObject<{
    select: z.ZodLazy<z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs>>>>;
    include: z.ZodLazy<z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs>>>>;
    orderBy: z.ZodOptional<z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.PostOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostOrderByWithRelationInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.PostOrderByWithRelationInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostOrderByWithRelationInput>, "many">]>>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereInput>>;
    cursor: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.PostWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.PostWhereUniqueInput>>;
    take: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    distinct: z.ZodOptional<z.ZodArray<z.ZodEnum<["id", "createdAt", "updatedAt", "title", "content", "published", "viewCount", "authorId", "likes", "bytes"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    orderBy?: import(".prisma/client").Prisma.PostOrderByWithRelationInput | import(".prisma/client").Prisma.PostOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.PostWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    distinct?: ("id" | "createdAt" | "updatedAt" | "title" | "content" | "published" | "viewCount" | "authorId" | "likes" | "bytes")[] | undefined;
}, {
    select?: import(".prisma/client").Prisma.PostSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    include?: import(".prisma/client").Prisma.PostInclude<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
    orderBy?: import(".prisma/client").Prisma.PostOrderByWithRelationInput | import(".prisma/client").Prisma.PostOrderByWithRelationInput[] | undefined;
    where?: import(".prisma/client").Prisma.PostWhereInput | undefined;
    cursor?: import(".prisma/client").Prisma.PostWhereUniqueInput | undefined;
    take?: number | undefined;
    skip?: number | undefined;
    distinct?: ("id" | "createdAt" | "updatedAt" | "title" | "content" | "published" | "viewCount" | "authorId" | "likes" | "bytes")[] | undefined;
}>;
