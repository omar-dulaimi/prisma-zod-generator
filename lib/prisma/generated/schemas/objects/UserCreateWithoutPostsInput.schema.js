"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateWithoutPostsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    email: zod_1.z.string(),
    name: zod_1.z.string().optional().nullable(),
})
    .strict();
exports.UserCreateWithoutPostsInputObjectSchema = Schema;
//# sourceMappingURL=UserCreateWithoutPostsInput.schema.js.map