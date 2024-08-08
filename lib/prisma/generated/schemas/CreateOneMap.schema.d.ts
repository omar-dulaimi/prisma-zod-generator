import { z } from 'zod';
export declare const MapCreateOneSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>, z.ZodTypeDef, import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs>>>;
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapCreateInput>, z.ZodType<import(".prisma/client").Prisma.MapUncheckedCreateInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUncheckedCreateInput>]>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.MapCreateInput | import(".prisma/client").Prisma.MapUncheckedCreateInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}, {
    data: import(".prisma/client").Prisma.MapCreateInput | import(".prisma/client").Prisma.MapUncheckedCreateInput;
    select?: import(".prisma/client").Prisma.MapSelect<import("@prisma/client/runtime/library").DefaultArgs> | undefined;
}>;
