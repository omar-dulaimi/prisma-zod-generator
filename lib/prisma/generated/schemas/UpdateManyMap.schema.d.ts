import { z } from 'zod';
export declare const MapUpdateManySchema: z.ZodObject<{
    data: z.ZodType<import(".prisma/client").Prisma.MapUpdateManyMutationInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapUpdateManyMutationInput>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.MapWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.MapWhereInput>>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.MapUpdateManyMutationInput;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
}, {
    data: import(".prisma/client").Prisma.MapUpdateManyMutationInput;
    where?: import(".prisma/client").Prisma.MapWhereInput | undefined;
}>;
