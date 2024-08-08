"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCountAggregateInputObjectSchema = void 0;
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
    _all: zod_1.z.literal(true).optional(),
})
    .strict();
exports.PostCountAggregateInputObjectSchema = Schema;
//# sourceMappingURL=PostCountAggregateInput.schema.js.map