import { z } from 'zod';
export declare const UserUpdateManySchema: z.ZodObject<{
    data: z.ZodType<import(".prisma/client").Prisma.UserUpdateManyMutationInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserUpdateManyMutationInput>;
    where: z.ZodOptional<z.ZodType<import(".prisma/client").Prisma.UserWhereInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserWhereInput>>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.UserUpdateManyMutationInput;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
}, {
    data: import(".prisma/client").Prisma.UserUpdateManyMutationInput;
    where?: import(".prisma/client").Prisma.UserWhereInput | undefined;
}>;
