"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedFloatFilterObjectSchema = void 0;
const zod_1 = require("zod");
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
        .union([zod_1.z.number(), zod_1.z.lazy(() => exports.NestedFloatFilterObjectSchema)])
        .optional(),
})
    .strict();
exports.NestedFloatFilterObjectSchema = Schema;
//# sourceMappingURL=NestedFloatFilter.schema.js.map