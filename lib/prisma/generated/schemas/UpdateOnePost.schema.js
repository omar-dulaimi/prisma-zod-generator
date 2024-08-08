"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUpdateOneSchema = void 0;
const zod_1 = require("zod");
const PostSelect_schema_1 = require("./objects/PostSelect.schema");
const PostInclude_schema_1 = require("./objects/PostInclude.schema");
const PostUpdateInput_schema_1 = require("./objects/PostUpdateInput.schema");
const PostUncheckedUpdateInput_schema_1 = require("./objects/PostUncheckedUpdateInput.schema");
const PostWhereUniqueInput_schema_1 = require("./objects/PostWhereUniqueInput.schema");
exports.PostUpdateOneSchema = zod_1.z.object({
    select: PostSelect_schema_1.PostSelectObjectSchema.optional(),
    include: PostInclude_schema_1.PostIncludeObjectSchema.optional(),
    data: zod_1.z.union([
        PostUpdateInput_schema_1.PostUpdateInputObjectSchema,
        PostUncheckedUpdateInput_schema_1.PostUncheckedUpdateInputObjectSchema,
    ]),
    where: PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema,
});
//# sourceMappingURL=UpdateOnePost.schema.js.map