"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapCountAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.literal(true).optional(),
    value: zod_1.z.literal(true).optional(),
    _all: zod_1.z.literal(true).optional(),
})
    .strict();
exports.MapCountAggregateInputObjectSchema = Schema;
//# sourceMappingURL=MapCountAggregateInput.schema.js.map