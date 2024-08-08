"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrderByWithAggregationInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
const SortOrderInput_schema_1 = require("./SortOrderInput.schema");
const UserCountOrderByAggregateInput_schema_1 = require("./UserCountOrderByAggregateInput.schema");
const UserAvgOrderByAggregateInput_schema_1 = require("./UserAvgOrderByAggregateInput.schema");
const UserMaxOrderByAggregateInput_schema_1 = require("./UserMaxOrderByAggregateInput.schema");
const UserMinOrderByAggregateInput_schema_1 = require("./UserMinOrderByAggregateInput.schema");
const UserSumOrderByAggregateInput_schema_1 = require("./UserSumOrderByAggregateInput.schema");
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
    _count: zod_1.z.lazy(() => UserCountOrderByAggregateInput_schema_1.UserCountOrderByAggregateInputObjectSchema).optional(),
    _avg: zod_1.z.lazy(() => UserAvgOrderByAggregateInput_schema_1.UserAvgOrderByAggregateInputObjectSchema).optional(),
    _max: zod_1.z.lazy(() => UserMaxOrderByAggregateInput_schema_1.UserMaxOrderByAggregateInputObjectSchema).optional(),
    _min: zod_1.z.lazy(() => UserMinOrderByAggregateInput_schema_1.UserMinOrderByAggregateInputObjectSchema).optional(),
    _sum: zod_1.z.lazy(() => UserSumOrderByAggregateInput_schema_1.UserSumOrderByAggregateInputObjectSchema).optional(),
})
    .strict();
exports.UserOrderByWithAggregationInputObjectSchema = Schema;
//# sourceMappingURL=UserOrderByWithAggregationInput.schema.js.map