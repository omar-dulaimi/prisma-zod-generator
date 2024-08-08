"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserScalarWhereWithAggregatesInputObjectSchema = void 0;
const zod_1 = require("zod");
const IntWithAggregatesFilter_schema_1 = require("./IntWithAggregatesFilter.schema");
const StringWithAggregatesFilter_schema_1 = require("./StringWithAggregatesFilter.schema");
const StringNullableWithAggregatesFilter_schema_1 = require("./StringNullableWithAggregatesFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.UserScalarWhereWithAggregatesInputObjectSchema),
        zod_1.z.lazy(() => exports.UserScalarWhereWithAggregatesInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => exports.UserScalarWhereWithAggregatesInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.UserScalarWhereWithAggregatesInputObjectSchema),
        zod_1.z.lazy(() => exports.UserScalarWhereWithAggregatesInputObjectSchema).array(),
    ])
        .optional(),
    id: zod_1.z
        .union([zod_1.z.lazy(() => IntWithAggregatesFilter_schema_1.IntWithAggregatesFilterObjectSchema), zod_1.z.number()])
        .optional(),
    email: zod_1.z
        .union([zod_1.z.lazy(() => StringWithAggregatesFilter_schema_1.StringWithAggregatesFilterObjectSchema), zod_1.z.string()])
        .optional(),
    name: zod_1.z
        .union([
        zod_1.z.lazy(() => StringNullableWithAggregatesFilter_schema_1.StringNullableWithAggregatesFilterObjectSchema),
        zod_1.z.string(),
    ])
        .optional()
        .nullable(),
})
    .strict();
exports.UserScalarWhereWithAggregatesInputObjectSchema = Schema;
//# sourceMappingURL=UserScalarWhereWithAggregatesInput.schema.js.map