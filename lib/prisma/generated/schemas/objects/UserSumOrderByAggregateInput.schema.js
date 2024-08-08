"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSumOrderByAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
})
    .strict();
exports.UserSumOrderByAggregateInputObjectSchema = Schema;
//# sourceMappingURL=UserSumOrderByAggregateInput.schema.js.map