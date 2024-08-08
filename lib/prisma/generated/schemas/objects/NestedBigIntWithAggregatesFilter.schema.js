"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedBigIntWithAggregatesFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedIntFilter_schema_1 = require("./NestedIntFilter.schema");
const NestedFloatFilter_schema_1 = require("./NestedFloatFilter.schema");
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
        .union([
        zod_1.z.bigint(),
        zod_1.z.lazy(() => exports.NestedBigIntWithAggregatesFilterObjectSchema),
    ])
        .optional(),
    _count: zod_1.z.lazy(() => NestedIntFilter_schema_1.NestedIntFilterObjectSchema).optional(),
    _avg: zod_1.z.lazy(() => NestedFloatFilter_schema_1.NestedFloatFilterObjectSchema).optional(),
    _sum: zod_1.z.lazy(() => NestedBigIntFilter_schema_1.NestedBigIntFilterObjectSchema).optional(),
    _min: zod_1.z.lazy(() => NestedBigIntFilter_schema_1.NestedBigIntFilterObjectSchema).optional(),
    _max: zod_1.z.lazy(() => NestedBigIntFilter_schema_1.NestedBigIntFilterObjectSchema).optional(),
})
    .strict();
exports.NestedBigIntWithAggregatesFilterObjectSchema = Schema;
//# sourceMappingURL=NestedBigIntWithAggregatesFilter.schema.js.map