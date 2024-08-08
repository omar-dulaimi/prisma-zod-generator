"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCreateInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserCreateNestedOneWithoutPostsInput_schema_1 = require("./UserCreateNestedOneWithoutPostsInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    createdAt: zod_1.z.coerce.date().optional(),
    updatedAt: zod_1.z.coerce.date().optional(),
    title: zod_1.z.string(),
    content: zod_1.z.string().optional().nullable(),
    published: zod_1.z.boolean().optional(),
    viewCount: zod_1.z.number().optional(),
    likes: zod_1.z.bigint(),
    bytes: zod_1.z.instanceof(Buffer),
    author: zod_1.z
        .lazy(() => UserCreateNestedOneWithoutPostsInput_schema_1.UserCreateNestedOneWithoutPostsInputObjectSchema)
        .optional(),
})
    .strict();
exports.PostCreateInputObjectSchema = Schema;
//# sourceMappingURL=PostCreateInput.schema.js.map