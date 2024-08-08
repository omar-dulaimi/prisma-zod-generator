import { z } from 'zod';
export declare const MapUpdateOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUpdateInput>, z.ZodType<import(".prisma/client").Prisma.MapUncheckedUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUncheckedUpdateInput>]>;
    where: z.ZodType<import(".prisma/client").Prisma.MapWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereUniqueInput>;
}, "strip", z.ZodTypeAny, {
    where: import(".prisma/client").Prisma.MapWhereUniqueInput;
    data: import(".prisma/client").Prisma.MapUpdateInput | import(".prisma/client").Prisma.MapUncheckedUpdateInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    where: import(".prisma/client").Prisma.MapWhereUniqueInput;
    data: import(".prisma/client").Prisma.MapUpdateInput | import(".prisma/client").Prisma.MapUncheckedUpdateInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
