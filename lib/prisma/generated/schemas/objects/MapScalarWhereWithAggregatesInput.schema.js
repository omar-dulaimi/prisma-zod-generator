"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapScalarWhereWithAggregatesInputObjectSchema = void 0;
const zod_1 = require("zod");
const StringWithAggregatesFilter_schema_1 = require("./StringWithAggregatesFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.MapScalarWhereWithAggregatesInputObjectSchema),
        zod_1.z.lazy(() => exports.MapScalarWhereWithAggregatesInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => exports.MapScalarWhereWithAggregatesInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.MapScalarWhereWithAggregatesInputObjectSchema),
        zod_1.z.lazy(() => exports.MapScalarWhereWithAggregatesInputObjectSchema).array(),
    ])
        .optional(),
    key: zod_1.z
        .union([zod_1.z.lazy(() => StringWithAggregatesFilter_schema_1.StringWithAggregatesFilterObjectSchema), zod_1.z.string()])
        .optional(),
    value: zod_1.z
        .union([zod_1.z.lazy(() => StringWithAggregatesFilter_schema_1.StringWithAggregatesFilterObjectSchema), zod_1.z.string()])
        .optional(),
})
    .strict();
exports.MapScalarWhereWithAggregatesInputObjectSchema = Schema;
//# sourceMappingURL=MapScalarWhereWithAggregatesInput.schema.js.map