"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapMaxAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.literal(true).optional(),
    value: zod_1.z.literal(true).optional(),
})
    .strict();
exports.MapMaxAggregateInputObjectSchema = Schema;
//# sourceMappingURL=MapMaxAggregateInput.schema.js.map