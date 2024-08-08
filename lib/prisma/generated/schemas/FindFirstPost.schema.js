"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostFindFirstSchema = void 0;
const zod_1 = require("zod");
const PostSelect_schema_1 = require("./objects/PostSelect.schema");
const PostInclude_schema_1 = require("./objects/PostInclude.schema");
const PostOrderByWithRelationInput_schema_1 = require("./objects/PostOrderByWithRelationInput.schema");
const PostWhereInput_schema_1 = require("./objects/PostWhereInput.schema");
const PostWhereUniqueInput_schema_1 = require("./objects/PostWhereUniqueInput.schema");
const PostScalarFieldEnum_schema_1 = require("./enums/PostScalarFieldEnum.schema");
exports.PostFindFirstSchema = zod_1.z.object({
    select: PostSelect_schema_1.PostSelectObjectSchema.optional(),
    include: PostInclude_schema_1.PostIncludeObjectSchema.optional(),
    orderBy: zod_1.z
        .union([
        PostOrderByWithRelationInput_schema_1.PostOrderByWithRelationInputObjectSchema,
        PostOrderByWithRelationInput_schema_1.PostOrderByWithRelationInputObjectSchema.array(),
    ])
        .optional(),
    where: PostWhereInput_schema_1.PostWhereInputObjectSchema.optional(),
    cursor: PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    distinct: zod_1.z.array(PostScalarFieldEnum_schema_1.PostScalarFieldEnumSchema).optional(),
});
//# sourceMappingURL=FindFirstPost.schema.js.map