"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserWhereUniqueInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
const StringNullableFilter_schema_1 = require("./StringNullableFilter.schema");
const PostListRelationFilter_schema_1 = require("./PostListRelationFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.number().optional(),
    email: zod_1.z.string().optional(),
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema),
        zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema),
        zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema).array(),
    ])
        .optional(),
    name: zod_1.z
        .union([zod_1.z.lazy(() => StringNullableFilter_schema_1.StringNullableFilterObjectSchema), zod_1.z.string()])
        .optional()
        .nullable(),
    posts: zod_1.z.lazy(() => PostListRelationFilter_schema_1.PostListRelationFilterObjectSchema).optional(),
})
    .strict();
exports.UserWhereUniqueInputObjectSchema = Schema;
//# sourceMappingURL=UserWhereUniqueInput.schema.js.map