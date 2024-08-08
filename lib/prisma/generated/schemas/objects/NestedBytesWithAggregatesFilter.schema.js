"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedBytesWithAggregatesFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedIntFilter_schema_1 = require("./NestedIntFilter.schema");
const NestedBytesFilter_schema_1 = require("./NestedBytesFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.instanceof(Buffer).optional(),
    in: zod_1.z.instanceof(Buffer).array().optional(),
    notIn: zod_1.z.instanceof(Buffer).array().optional(),
    not: zod_1.z
        .union([
        zod_1.z.instanceof(Buffer),
        zod_1.z.lazy(() => exports.NestedBytesWithAggregatesFilterObjectSchema),
    ])
        .optional(),
    _count: zod_1.z.lazy(() => NestedIntFilter_schema_1.NestedIntFilterObjectSchema).optional(),
    _min: zod_1.z.lazy(() => NestedBytesFilter_schema_1.NestedBytesFilterObjectSchema).optional(),
    _max: zod_1.z.lazy(() => NestedBytesFilter_schema_1.NestedBytesFilterObjectSchema).optional(),
})
    .strict();
exports.NestedBytesWithAggregatesFilterObjectSchema = Schema;
//# sourceMappingURL=NestedBytesWithAggregatesFilter.schema.js.map