"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostDeleteOneSchema = void 0;
const zod_1 = require("zod");
const PostSelect_schema_1 = require("./objects/PostSelect.schema");
const PostInclude_schema_1 = require("./objects/PostInclude.schema");
const PostWhereUniqueInput_schema_1 = require("./objects/PostWhereUniqueInput.schema");
exports.PostDeleteOneSchema = zod_1.z.object({
    select: PostSelect_schema_1.PostSelectObjectSchema.optional(),
    include: PostInclude_schema_1.PostIncludeObjectSchema.optional(),
    where: PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema,
});
//# sourceMappingURL=DeleteOnePost.schema.js.map