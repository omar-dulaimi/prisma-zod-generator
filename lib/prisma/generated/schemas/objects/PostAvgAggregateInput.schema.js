"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostAvgAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.literal(true).optional(),
    viewCount: zod_1.z.literal(true).optional(),
    authorId: zod_1.z.literal(true).optional(),
    likes: zod_1.z.literal(true).optional(),
})
    .strict();
exports.PostAvgAggregateInputObjectSchema = Schema;
//# sourceMappingURL=PostAvgAggregateInput.schema.js.map