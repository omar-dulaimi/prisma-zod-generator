"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostWhereInputObjectSchema = void 0;
const zod_1 = require("zod");
const IntFilter_schema_1 = require("./IntFilter.schema");
const DateTimeFilter_schema_1 = require("./DateTimeFilter.schema");
const StringFilter_schema_1 = require("./StringFilter.schema");
const StringNullableFilter_schema_1 = require("./StringNullableFilter.schema");
const BoolFilter_schema_1 = require("./BoolFilter.schema");
const IntNullableFilter_schema_1 = require("./IntNullableFilter.schema");
const BigIntFilter_schema_1 = require("./BigIntFilter.schema");
const BytesFilter_schema_1 = require("./BytesFilter.schema");
const UserNullableRelationFilter_schema_1 = require("./UserNullableRelationFilter.schema");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.PostWhereInputObjectSchema),
        zod_1.z.lazy(() => exports.PostWhereInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => exports.PostWhereInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.PostWhereInputObjectSchema),
        zod_1.z.lazy(() => exports.PostWhereInputObjectSchema).array(),
    ])
        .optional(),
    id: zod_1.z.union([zod_1.z.lazy(() => IntFilter_schema_1.IntFilterObjectSchema), zod_1.z.number()]).optional(),
    createdAt: zod_1.z
        .union([zod_1.z.lazy(() => DateTimeFilter_schema_1.DateTimeFilterObjectSchema), zod_1.z.coerce.date()])
        .optional(),
    updatedAt: zod_1.z
        .union([zod_1.z.lazy(() => DateTimeFilter_schema_1.DateTimeFilterObjectSchema), zod_1.z.coerce.date()])
        .optional(),
    title: zod_1.z
        .union([zod_1.z.lazy(() => StringFilter_schema_1.StringFilterObjectSchema), zod_1.z.string()])
        .optional(),
    content: zod_1.z
        .union([zod_1.z.lazy(() => StringNullableFilter_schema_1.StringNullableFilterObjectSchema), zod_1.z.string()])
        .optional()
        .nullable(),
    published: zod_1.z
        .union([zod_1.z.lazy(() => BoolFilter_schema_1.BoolFilterObjectSchema), zod_1.z.boolean()])
        .optional(),
    viewCount: zod_1.z
        .union([zod_1.z.lazy(() => IntFilter_schema_1.IntFilterObjectSchema), zod_1.z.number()])
        .optional(),
    authorId: zod_1.z
        .union([zod_1.z.lazy(() => IntNullableFilter_schema_1.IntNullableFilterObjectSchema), zod_1.z.number()])
        .optional()
        .nullable(),
    likes: zod_1.z
        .union([zod_1.z.lazy(() => BigIntFilter_schema_1.BigIntFilterObjectSchema), zod_1.z.bigint()])
        .optional(),
    bytes: zod_1.z
        .union([zod_1.z.lazy(() => BytesFilter_schema_1.BytesFilterObjectSchema), zod_1.z.instanceof(Buffer)])
        .optional(),
    author: zod_1.z
        .union([
        zod_1.z.lazy(() => UserNullableRelationFilter_schema_1.UserNullableRelationFilterObjectSchema),
        zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema),
    ])
        .optional()
        .nullable(),
})
    .strict();
exports.PostWhereInputObjectSchema = Schema;
//# sourceMappingURL=PostWhereInput.schema.js.map