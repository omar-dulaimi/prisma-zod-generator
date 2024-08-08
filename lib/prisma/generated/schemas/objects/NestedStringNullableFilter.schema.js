"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedStringNullableFilterObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.string().optional().nullable(),
    in: zod_1.z.string().array().optional().nullable(),
    notIn: zod_1.z.string().array().optional().nullable(),
    lt: zod_1.z.string().optional(),
    lte: zod_1.z.string().optional(),
    gt: zod_1.z.string().optional(),
    gte: zod_1.z.string().optional(),
    contains: zod_1.z.string().optional(),
    startsWith: zod_1.z.string().optional(),
    endsWith: zod_1.z.string().optional(),
    not: zod_1.z
        .union([zod_1.z.string(), zod_1.z.lazy(() => exports.NestedStringNullableFilterObjectSchema)])
        .optional()
        .nullable(),
})
    .strict();
exports.NestedStringNullableFilterObjectSchema = Schema;
//# sourceMappingURL=NestedStringNullableFilter.schema.js.map