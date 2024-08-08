"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntNullableFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedIntNullableFilter_schema_1 = require("./NestedIntNullableFilter.schema");
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
        .union([zod_1.z.number(), zod_1.z.lazy(() => NestedIntNullableFilter_schema_1.NestedIntNullableFilterObjectSchema)])
        .optional()
        .nullable(),
})
    .strict();
exports.IntNullableFilterObjectSchema = Schema;
//# sourceMappingURL=IntNullableFilter.schema.js.map