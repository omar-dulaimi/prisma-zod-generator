"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostAggregateSchema = void 0;
const zod_1 = require("zod");
const PostOrderByWithRelationInput_schema_1 = require("./objects/PostOrderByWithRelationInput.schema");
const PostWhereInput_schema_1 = require("./objects/PostWhereInput.schema");
const PostWhereUniqueInput_schema_1 = require("./objects/PostWhereUniqueInput.schema");
const PostCountAggregateInput_schema_1 = require("./objects/PostCountAggregateInput.schema");
const PostMinAggregateInput_schema_1 = require("./objects/PostMinAggregateInput.schema");
const PostMaxAggregateInput_schema_1 = require("./objects/PostMaxAggregateInput.schema");
const PostAvgAggregateInput_schema_1 = require("./objects/PostAvgAggregateInput.schema");
const PostSumAggregateInput_schema_1 = require("./objects/PostSumAggregateInput.schema");
exports.PostAggregateSchema = zod_1.z.object({
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
    _count: zod_1.z
        .union([zod_1.z.literal(true), PostCountAggregateInput_schema_1.PostCountAggregateInputObjectSchema])
        .optional(),
    _min: PostMinAggregateInput_schema_1.PostMinAggregateInputObjectSchema.optional(),
    _max: PostMaxAggregateInput_schema_1.PostMaxAggregateInputObjectSchema.optional(),
    _avg: PostAvgAggregateInput_schema_1.PostAvgAggregateInputObjectSchema.optional(),
    _sum: PostSumAggregateInput_schema_1.PostSumAggregateInputObjectSchema.optional(),
});
//# sourceMappingURL=AggregatePost.schema.js.map