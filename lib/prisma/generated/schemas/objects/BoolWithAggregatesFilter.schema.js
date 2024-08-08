"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoolWithAggregatesFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedBoolWithAggregatesFilter_schema_1 = require("./NestedBoolWithAggregatesFilter.schema");
const NestedIntFilter_schema_1 = require("./NestedIntFilter.schema");
const NestedBoolFilter_schema_1 = require("./NestedBoolFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.boolean().optional(),
    not: zod_1.z
        .union([
        zod_1.z.boolean(),
        zod_1.z.lazy(() => NestedBoolWithAggregatesFilter_schema_1.NestedBoolWithAggregatesFilterObjectSchema),
    ])
        .optional(),
    _count: zod_1.z.lazy(() => NestedIntFilter_schema_1.NestedIntFilterObjectSchema).optional(),
    _min: zod_1.z.lazy(() => NestedBoolFilter_schema_1.NestedBoolFilterObjectSchema).optional(),
    _max: zod_1.z.lazy(() => NestedBoolFilter_schema_1.NestedBoolFilterObjectSchema).optional(),
})
    .strict();
exports.BoolWithAggregatesFilterObjectSchema = Schema;
//# sourceMappingURL=BoolWithAggregatesFilter.schema.js.map