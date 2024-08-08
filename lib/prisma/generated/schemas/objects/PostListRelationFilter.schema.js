"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostListRelationFilterObjectSchema = void 0;
const zod_1 = require("zod");
const PostWhereInput_schema_1 = require("./PostWhereInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    every: zod_1.z.lazy(() => PostWhereInput_schema_1.PostWhereInputObjectSchema).optional(),
    some: zod_1.z.lazy(() => PostWhereInput_schema_1.PostWhereInputObjectSchema).optional(),
    none: zod_1.z.lazy(() => PostWhereInput_schema_1.PostWhereInputObjectSchema).optional(),
})
    .strict();
exports.PostListRelationFilterObjectSchema = Schema;
//# sourceMappingURL=PostListRelationFilter.schema.js.map