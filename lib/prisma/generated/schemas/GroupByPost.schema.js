"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostGroupBySchema = void 0;
const zod_1 = require("zod");
const PostWhereInput_schema_1 = require("./objects/PostWhereInput.schema");
const PostOrderByWithAggregationInput_schema_1 = require("./objects/PostOrderByWithAggregationInput.schema");
const PostScalarWhereWithAggregatesInput_schema_1 = require("./objects/PostScalarWhereWithAggregatesInput.schema");
const PostScalarFieldEnum_schema_1 = require("./enums/PostScalarFieldEnum.schema");
exports.PostGroupBySchema = zod_1.z.object({
    where: PostWhereInput_schema_1.PostWhereInputObjectSchema.optional(),
    orderBy: zod_1.z
        .union([
        PostOrderByWithAggregationInput_schema_1.PostOrderByWithAggregationInputObjectSchema,
        PostOrderByWithAggregationInput_schema_1.PostOrderByWithAggregationInputObjectSchema.array(),
    ])
        .optional(),
    having: PostScalarWhereWithAggregatesInput_schema_1.PostScalarWhereWithAggregatesInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    by: zod_1.z.array(PostScalarFieldEnum_schema_1.PostScalarFieldEnumSchema),
});
//# sourceMappingURL=GroupByPost.schema.js.map