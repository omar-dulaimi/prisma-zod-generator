"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostOrderByWithAggregationInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
const SortOrderInput_schema_1 = require("./SortOrderInput.schema");
const PostCountOrderByAggregateInput_schema_1 = require("./PostCountOrderByAggregateInput.schema");
const PostAvgOrderByAggregateInput_schema_1 = require("./PostAvgOrderByAggregateInput.schema");
const PostMaxOrderByAggregateInput_schema_1 = require("./PostMaxOrderByAggregateInput.schema");
const PostMinOrderByAggregateInput_schema_1 = require("./PostMinOrderByAggregateInput.schema");
const PostSumOrderByAggregateInput_schema_1 = require("./PostSumOrderByAggregateInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    createdAt: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    updatedAt: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    title: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    content: zod_1.z
        .union([
        zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema),
        zod_1.z.lazy(() => SortOrderInput_schema_1.SortOrderInputObjectSchema),
    ])
        .optional(),
    published: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    viewCount: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    authorId: zod_1.z
        .union([
        zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema),
        zod_1.z.lazy(() => SortOrderInput_schema_1.SortOrderInputObjectSchema),
    ])
        .optional(),
    likes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    bytes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    _count: zod_1.z.lazy(() => PostCountOrderByAggregateInput_schema_1.PostCountOrderByAggregateInputObjectSchema).optional(),
    _avg: zod_1.z.lazy(() => PostAvgOrderByAggregateInput_schema_1.PostAvgOrderByAggregateInputObjectSchema).optional(),
    _max: zod_1.z.lazy(() => PostMaxOrderByAggregateInput_schema_1.PostMaxOrderByAggregateInputObjectSchema).optional(),
    _min: zod_1.z.lazy(() => PostMinOrderByAggregateInput_schema_1.PostMinOrderByAggregateInputObjectSchema).optional(),
    _sum: zod_1.z.lazy(() => PostSumOrderByAggregateInput_schema_1.PostSumOrderByAggregateInputObjectSchema).optional(),
})
    .strict();
exports.PostOrderByWithAggregationInputObjectSchema = Schema;
//# sourceMappingURL=PostOrderByWithAggregationInput.schema.js.map