"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostMinOrderByAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    createdAt: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    updatedAt: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    title: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    content: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    published: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    viewCount: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    authorId: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    likes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    bytes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
})
    .strict();
exports.PostMinOrderByAggregateInputObjectSchema = Schema;
//# sourceMappingURL=PostMinOrderByAggregateInput.schema.js.map