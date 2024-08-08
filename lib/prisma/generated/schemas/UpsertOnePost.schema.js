"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUpsertSchema = void 0;
const zod_1 = require("zod");
const PostSelect_schema_1 = require("./objects/PostSelect.schema");
const PostInclude_schema_1 = require("./objects/PostInclude.schema");
const PostWhereUniqueInput_schema_1 = require("./objects/PostWhereUniqueInput.schema");
const PostCreateInput_schema_1 = require("./objects/PostCreateInput.schema");
const PostUncheckedCreateInput_schema_1 = require("./objects/PostUncheckedCreateInput.schema");
const PostUpdateInput_schema_1 = require("./objects/PostUpdateInput.schema");
const PostUncheckedUpdateInput_schema_1 = require("./objects/PostUncheckedUpdateInput.schema");
exports.PostUpsertSchema = zod_1.z.object({
    select: PostSelect_schema_1.PostSelectObjectSchema.optional(),
    include: PostInclude_schema_1.PostIncludeObjectSchema.optional(),
    where: PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema,
    create: zod_1.z.union([
        PostCreateInput_schema_1.PostCreateInputObjectSchema,
        PostUncheckedCreateInput_schema_1.PostUncheckedCreateInputObjectSchema,
    ]),
    update: zod_1.z.union([
        PostUpdateInput_schema_1.PostUpdateInputObjectSchema,
        PostUncheckedUpdateInput_schema_1.PostUncheckedUpdateInputObjectSchema,
    ]),
});
//# sourceMappingURL=UpsertOnePost.schema.js.map