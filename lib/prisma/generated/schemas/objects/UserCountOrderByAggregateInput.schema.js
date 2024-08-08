"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCountOrderByAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    email: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    name: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
})
    .strict();
exports.UserCountOrderByAggregateInputObjectSchema = Schema;
//# sourceMappingURL=UserCountOrderByAggregateInput.schema.js.map