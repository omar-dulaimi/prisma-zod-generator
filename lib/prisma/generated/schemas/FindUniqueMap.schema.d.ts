import { z } from 'zod';
export declare const MapFindUniqueSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    where: z.ZodType<import(".prisma/client").Prisma.MapWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereUniqueInput>;
}, "strip", z.ZodTypeAny, {
    where: import(".prisma/client").Prisma.MapWhereUniqueInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    where: import(".prisma/client").Prisma.MapWhereUniqueInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
