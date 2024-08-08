"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCreateOneSchema = void 0;
const zod_1 = require("zod");
const PostSelect_schema_1 = require("./objects/PostSelect.schema");
const PostInclude_schema_1 = require("./objects/PostInclude.schema");
const PostCreateInput_schema_1 = require("./objects/PostCreateInput.schema");
const PostUncheckedCreateInput_schema_1 = require("./objects/PostUncheckedCreateInput.schema");
exports.PostCreateOneSchema = zod_1.z.object({
    select: PostSelect_schema_1.PostSelectObjectSchema.optional(),
    include: PostInclude_schema_1.PostIncludeObjectSchema.optional(),
    data: zod_1.z.union([
        PostCreateInput_schema_1.PostCreateInputObjectSchema,
        PostUncheckedCreateInput_schema_1.PostUncheckedCreateInputObjectSchema,
    ]),
});
//# sourceMappingURL=CreateOnePost.schema.js.map