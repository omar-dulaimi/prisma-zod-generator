"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrderByWithRelationInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
const SortOrderInput_schema_1 = require("./SortOrderInput.schema");
const PostOrderByRelationAggregateInput_schema_1 = require("./PostOrderByRelationAggregateInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    email: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    name: zod_1.z
        .union([
        zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema),
        zod_1.z.lazy(() => SortOrderInput_schema_1.SortOrderInputObjectSchema),
    ])
        .optional(),
    posts: zod_1.z
        .lazy(() => PostOrderByRelationAggregateInput_schema_1.PostOrderByRelationAggregateInputObjectSchema)
        .optional(),
})
    .strict();
exports.UserOrderByWithRelationInputObjectSchema = Schema;
//# sourceMappingURL=UserOrderByWithRelationInput.schema.js.map