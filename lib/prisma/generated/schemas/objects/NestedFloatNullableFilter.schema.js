"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedFloatNullableFilterObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.number().optional().nullable(),
    in: zod_1.z.number().array().optional().nullable(),
    notIn: zod_1.z.number().array().optional().nullable(),
    lt: zod_1.z.number().optional(),
    lte: zod_1.z.number().optional(),
    gt: zod_1.z.number().optional(),
    gte: zod_1.z.number().optional(),
    not: zod_1.z
        .union([zod_1.z.number(), zod_1.z.lazy(() => exports.NestedFloatNullableFilterObjectSchema)])
        .optional()
        .nullable(),
})
    .strict();
exports.NestedFloatNullableFilterObjectSchema = Schema;
//# sourceMappingURL=NestedFloatNullableFilter.schema.js.map