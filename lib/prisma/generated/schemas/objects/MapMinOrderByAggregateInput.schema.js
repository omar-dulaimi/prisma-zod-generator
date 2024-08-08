"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapMinOrderByAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    value: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
})
    .strict();
exports.MapMinOrderByAggregateInputObjectSchema = Schema;
//# sourceMappingURL=MapMinOrderByAggregateInput.schema.js.map