"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedIntFilter_schema_1 = require("./NestedIntFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.number().optional(),
    in: zod_1.z.number().array().optional(),
    notIn: zod_1.z.number().array().optional(),
    lt: zod_1.z.number().optional(),
    lte: zod_1.z.number().optional(),
    gt: zod_1.z.number().optional(),
    gte: zod_1.z.number().optional(),
    not: zod_1.z
        .union([zod_1.z.number(), zod_1.z.lazy(() => NestedIntFilter_schema_1.NestedIntFilterObjectSchema)])
        .optional(),
})
    .strict();
exports.IntFilterObjectSchema = Schema;
//# sourceMappingURL=IntFilter.schema.js.map