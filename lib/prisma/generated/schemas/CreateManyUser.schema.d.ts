import { z } from 'zod';
export declare const UserCreateManySchema: z.ZodObject<{
    data: z.ZodUnion<[z.ZodType<import(".prisma/client").Prisma.UserCreateManyInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserCreateManyInput>, z.ZodArray<z.ZodType<import(".prisma/client").Prisma.UserCreateManyInput, z.ZodTypeDef, import(".prisma/client").Prisma.UserCreateManyInput>, "many">]>;
    skipDuplicates: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    data: import(".prisma/client").Prisma.UserCreateManyInput | import(".prisma/client").Prisma.UserCreateManyInput[];
    skipDuplicates?: boolean | undefined;
}, {
    data: import(".prisma/client").Prisma.UserCreateManyInput | import(".prisma/client").Prisma.UserCreateManyInput[];
    skipDuplicates?: boolean | undefined;
}>;
