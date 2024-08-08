"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapMinAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.literal(true).optional(),
    value: zod_1.z.literal(true).optional(),
})
    .strict();
exports.MapMinAggregateInputObjectSchema = Schema;
//# sourceMappingURL=MapMinAggregateInput.schema.js.map