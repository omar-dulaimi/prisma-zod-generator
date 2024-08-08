import { z } from 'zod';
export declare const UserDeleteManySchema: z.ZodObject<{
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereInput>>;
}, "strip", z.ZodTypeAny, {
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
}, {
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
}>;
