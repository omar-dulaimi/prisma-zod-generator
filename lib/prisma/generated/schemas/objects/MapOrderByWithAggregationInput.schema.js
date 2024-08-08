"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapOrderByWithAggregationInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
const MapCountOrderByAggregateInput_schema_1 = require("./MapCountOrderByAggregateInput.schema");
const MapMaxOrderByAggregateInput_schema_1 = require("./MapMaxOrderByAggregateInput.schema");
const MapMinOrderByAggregateInput_schema_1 = require("./MapMinOrderByAggregateInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    value: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    _count: zod_1.z.lazy(() => MapCountOrderByAggregateInput_schema_1.MapCountOrderByAggregateInputObjectSchema).optional(),
    _max: zod_1.z.lazy(() => MapMaxOrderByAggregateInput_schema_1.MapMaxOrderByAggregateInputObjectSchema).optional(),
    _min: zod_1.z.lazy(() => MapMinOrderByAggregateInput_schema_1.MapMinOrderByAggregateInputObjectSchema).optional(),
})
    .strict();
exports.MapOrderByWithAggregationInputObjectSchema = Schema;
//# sourceMappingURL=MapOrderByWithAggregationInput.schema.js.map