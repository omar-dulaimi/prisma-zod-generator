"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUncheckedCreateWithoutPostsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.number().optional(),
    email: zod_1.z.string(),
    name: zod_1.z.string().optional().nullable(),
})
    .strict();
exports.UserUncheckedCreateWithoutPostsInputObjectSchema = Schema;
//# sourceMappingURL=UserUncheckedCreateWithoutPostsInput.schema.js.map