"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedBoolWithAggregatesFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedIntFilter_schema_1 = require("./NestedIntFilter.schema");
const NestedBoolFilter_schema_1 = require("./NestedBoolFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.boolean().optional(),
    not: zod_1.z
        .union([
        zod_1.z.boolean(),
        zod_1.z.lazy(() => exports.NestedBoolWithAggregatesFilterObjectSchema),
    ])
        .optional(),
    _count: zod_1.z.lazy(() => NestedIntFilter_schema_1.NestedIntFilterObjectSchema).optional(),
    _min: zod_1.z.lazy(() => NestedBoolFilter_schema_1.NestedBoolFilterObjectSchema).optional(),
    _max: zod_1.z.lazy(() => NestedBoolFilter_schema_1.NestedBoolFilterObjectSchema).optional(),
})
    .strict();
exports.NestedBoolWithAggregatesFilterObjectSchema = Schema;
//# sourceMappingURL=NestedBoolWithAggregatesFilter.schema.js.map