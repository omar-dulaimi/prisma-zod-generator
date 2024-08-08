"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUncheckedCreateInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.number().optional(),
    createdAt: zod_1.z.coerce.date().optional(),
    updatedAt: zod_1.z.coerce.date().optional(),
    title: zod_1.z.string(),
    content: zod_1.z.string().optional().nullable(),
    published: zod_1.z.boolean().optional(),
    viewCount: zod_1.z.number().optional(),
    authorId: zod_1.z.number().optional().nullable(),
    likes: zod_1.z.bigint(),
    bytes: zod_1.z.instanceof(Buffer),
})
    .strict();
exports.PostUncheckedCreateInputObjectSchema = Schema;
//# sourceMappingURL=PostUncheckedCreateInput.schema.js.map