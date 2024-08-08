"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedBigIntFilterObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.bigint().optional(),
    in: zod_1.z.bigint().array().optional(),
    notIn: zod_1.z.bigint().array().optional(),
    lt: zod_1.z.bigint().optional(),
    lte: zod_1.z.bigint().optional(),
    gt: zod_1.z.bigint().optional(),
    gte: zod_1.z.bigint().optional(),
    not: zod_1.z
        .union([zod_1.z.bigint(), zod_1.z.lazy(() => exports.NestedBigIntFilterObjectSchema)])
        .optional(),
})
    .strict();
exports.NestedBigIntFilterObjectSchema = Schema;
//# sourceMappingURL=NestedBigIntFilter.schema.js.map