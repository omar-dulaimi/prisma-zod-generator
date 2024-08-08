import { z } from 'zod';
export declare const MapCreateManySchema: z.ZodObject<{
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.MapCreateManyInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapCreateManyInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.MapCreateManyInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapCreateManyInput>, "many">]>;
    skipDuplicates: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.MapCreateManyInput | import(".prisma/client").Prisma.MapCreateManyInput[];
    skipDuplicates?: boolean | undefined;
}, {
    data: import(".prisma/client").Prisma.MapCreateManyInput | import(".prisma/client").Prisma.MapCreateManyInput[];
    skipDuplicates?: boolean | undefined;
}>;
