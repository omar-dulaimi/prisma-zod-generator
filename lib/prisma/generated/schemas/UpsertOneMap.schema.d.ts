import { z } from 'zod';
export declare const MapUpsertSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    where: z.ZodType<import(".prisma/client").Prisma.MapWhereUniqueInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereUniqueInput>;
    create: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapCreateInput>, z.ZodType<import(".prisma/client").Prisma.MapUncheckedCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUncheckedCreateInput>]>;
    update: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUpdateInput>, z.ZodType<import(".prisma/client").Prisma.MapUncheckedUpdateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUncheckedUpdateInput>]>;
}, "strip", z.ZodTypeAny, {
    create: import(".prisma/client").Prisma.MapCreateInput | import(".prisma/client").Prisma.MapUncheckedCreateInput;
    update: import(".prisma/client").Prisma.MapUpdateInput | import(".prisma/client").Prisma.MapUncheckedUpdateInput;
    where: import(".prisma/client").Prisma.MapWhereUniqueInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    create: import(".prisma/client").Prisma.MapCreateInput | import(".prisma/client").Prisma.MapUncheckedCreateInput;
    update: import(".prisma/client").Prisma.MapUpdateInput | import(".prisma/client").Prisma.MapUncheckedUpdateInput;
    where: import(".prisma/client").Prisma.MapWhereUniqueInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
