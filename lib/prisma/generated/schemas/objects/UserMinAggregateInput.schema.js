"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMinAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.literal(true).optional(),
    email: zod_1.z.literal(true).optional(),
    name: zod_1.z.literal(true).optional(),
})
    .strict();
exports.UserMinAggregateInputObjectSchema = Schema;
//# sourceMappingURL=UserMinAggregateInput.schema.js.map