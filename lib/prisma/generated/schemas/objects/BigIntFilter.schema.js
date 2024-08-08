"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigIntFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedBigIntFilter_schema_1 = require("./NestedBigIntFilter.schema");
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
        .union([zod_1.z.bigint(), zod_1.z.lazy(() => NestedBigIntFilter_schema_1.NestedBigIntFilterObjectSchema)])
        .optional(),
})
    .strict();
exports.BigIntFilterObjectSchema = Schema;
//# sourceMappingURL=BigIntFilter.schema.js.map