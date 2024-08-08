"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAvgAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.literal(true).optional(),
})
    .strict();
exports.UserAvgAggregateInputObjectSchema = Schema;
//# sourceMappingURL=UserAvgAggregateInput.schema.js.map