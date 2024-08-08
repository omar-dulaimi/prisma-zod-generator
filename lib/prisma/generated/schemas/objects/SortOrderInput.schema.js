"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortOrderInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
const NullsOrder_schema_1 = require("../enums/NullsOrder.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    sort: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema),
    nulls: zod_1.z.lazy(() => NullsOrder_schema_1.NullsOrderSchema).optional(),
})
    .strict();
exports.SortOrderInputObjectSchema = Schema;
//# sourceMappingURL=SortOrderInput.schema.js.map