"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostAvgOrderByAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    viewCount: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    authorId: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    likes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
})
    .strict();
exports.PostAvgOrderByAggregateInputObjectSchema = Schema;
//# sourceMappingURL=PostAvgOrderByAggregateInput.schema.js.map