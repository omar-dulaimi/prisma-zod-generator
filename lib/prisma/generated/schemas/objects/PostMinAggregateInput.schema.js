"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostMinAggregateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.literal(true).optional(),
    createdAt: zod_1.z.literal(true).optional(),
    updatedAt: zod_1.z.literal(true).optional(),
    title: zod_1.z.literal(true).optional(),
    content: zod_1.z.literal(true).optional(),
    published: zod_1.z.literal(true).optional(),
    viewCount: zod_1.z.literal(true).optional(),
    authorId: zod_1.z.literal(true).optional(),
    likes: zod_1.z.literal(true).optional(),
    bytes: zod_1.z.literal(true).optional(),
})
    .strict();
exports.PostMinAggregateInputObjectSchema = Schema;
//# sourceMappingURL=PostMinAggregateInput.schema.js.map