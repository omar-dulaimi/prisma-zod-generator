"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserWhereInputObjectSchema = void 0;
const zod_1 = require("zod");
const IntFilter_schema_1 = require("./IntFilter.schema");
const StringFilter_schema_1 = require("./StringFilter.schema");
const StringNullableFilter_schema_1 = require("./StringNullableFilter.schema");
const PostListRelationFilter_schema_1 = require("./PostListRelationFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.UserWhereInputObjectSchema),
        zod_1.z.lazy(() => exports.UserWhereInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => exports.UserWhereInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.UserWhereInputObjectSchema),
        zod_1.z.lazy(() => exports.UserWhereInputObjectSchema).array(),
    ])
        .optional(),
    id: zod_1.z.union([zod_1.z.lazy(() => IntFilter_schema_1.IntFilterObjectSchema), zod_1.z.number()]).optional(),
    email: zod_1.z
        .union([zod_1.z.lazy(() => StringFilter_schema_1.StringFilterObjectSchema), zod_1.z.string()])
        .optional(),
    name: zod_1.z
        .union([zod_1.z.lazy(() => StringNullableFilter_schema_1.StringNullableFilterObjectSchema), zod_1.z.string()])
        .optional()
        .nullable(),
    posts: zod_1.z.lazy(() => PostListRelationFilter_schema_1.PostListRelationFilterObjectSchema).optional(),
})
    .strict();
exports.UserWhereInputObjectSchema = Schema;
//# sourceMappingURL=UserWhereInput.schema.js.map