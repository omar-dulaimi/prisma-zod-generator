"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostScalarWhereWithAggregatesInputObjectSchema = void 0;
const zod_1 = require("zod");
const IntWithAggregatesFilter_schema_1 = require("./IntWithAggregatesFilter.schema");
const DateTimeWithAggregatesFilter_schema_1 = require("./DateTimeWithAggregatesFilter.schema");
const StringWithAggregatesFilter_schema_1 = require("./StringWithAggregatesFilter.schema");
const StringNullableWithAggregatesFilter_schema_1 = require("./StringNullableWithAggregatesFilter.schema");
const BoolWithAggregatesFilter_schema_1 = require("./BoolWithAggregatesFilter.schema");
const IntNullableWithAggregatesFilter_schema_1 = require("./IntNullableWithAggregatesFilter.schema");
const BigIntWithAggregatesFilter_schema_1 = require("./BigIntWithAggregatesFilter.schema");
const BytesWithAggregatesFilter_schema_1 = require("./BytesWithAggregatesFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.PostScalarWhereWithAggregatesInputObjectSchema),
        zod_1.z.lazy(() => exports.PostScalarWhereWithAggregatesInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => exports.PostScalarWhereWithAggregatesInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.PostScalarWhereWithAggregatesInputObjectSchema),
        zod_1.z.lazy(() => exports.PostScalarWhereWithAggregatesInputObjectSchema).array(),
    ])
        .optional(),
    id: zod_1.z
        .union([zod_1.z.lazy(() => IntWithAggregatesFilter_schema_1.IntWithAggregatesFilterObjectSchema), zod_1.z.number()])
        .optional(),
    createdAt: zod_1.z
        .union([
        zod_1.z.lazy(() => DateTimeWithAggregatesFilter_schema_1.DateTimeWithAggregatesFilterObjectSchema),
        zod_1.z.coerce.date(),
    ])
        .optional(),
    updatedAt: zod_1.z
        .union([
        zod_1.z.lazy(() => DateTimeWithAggregatesFilter_schema_1.DateTimeWithAggregatesFilterObjectSchema),
        zod_1.z.coerce.date(),
    ])
        .optional(),
    title: zod_1.z
        .union([zod_1.z.lazy(() => StringWithAggregatesFilter_schema_1.StringWithAggregatesFilterObjectSchema), zod_1.z.string()])
        .optional(),
    content: zod_1.z
        .union([
        zod_1.z.lazy(() => StringNullableWithAggregatesFilter_schema_1.StringNullableWithAggregatesFilterObjectSchema),
        zod_1.z.string(),
    ])
        .optional()
        .nullable(),
    published: zod_1.z
        .union([zod_1.z.lazy(() => BoolWithAggregatesFilter_schema_1.BoolWithAggregatesFilterObjectSchema), zod_1.z.boolean()])
        .optional(),
    viewCount: zod_1.z
        .union([zod_1.z.lazy(() => IntWithAggregatesFilter_schema_1.IntWithAggregatesFilterObjectSchema), zod_1.z.number()])
        .optional(),
    authorId: zod_1.z
        .union([
        zod_1.z.lazy(() => IntNullableWithAggregatesFilter_schema_1.IntNullableWithAggregatesFilterObjectSchema),
        zod_1.z.number(),
    ])
        .optional()
        .nullable(),
    likes: zod_1.z
        .union([zod_1.z.lazy(() => BigIntWithAggregatesFilter_schema_1.BigIntWithAggregatesFilterObjectSchema), zod_1.z.bigint()])
        .optional(),
    bytes: zod_1.z
        .union([
        zod_1.z.lazy(() => BytesWithAggregatesFilter_schema_1.BytesWithAggregatesFilterObjectSchema),
        zod_1.z.instanceof(Buffer),
    ])
        .optional(),
})
    .strict();
exports.PostScalarWhereWithAggregatesInputObjectSchema = Schema;
//# sourceMappingURL=PostScalarWhereWithAggregatesInput.schema.js.map