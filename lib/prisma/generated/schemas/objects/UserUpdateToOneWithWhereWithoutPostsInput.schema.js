"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateToOneWithWhereWithoutPostsInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
const UserUpdateWithoutPostsInput_schema_1 = require("./UserUpdateWithoutPostsInput.schema");
const UserUncheckedUpdateWithoutPostsInput_schema_1 = require("./UserUncheckedUpdateWithoutPostsInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema).optional(),
    data: zod_1.z.union([
        zod_1.z.lazy(() => UserUpdateWithoutPostsInput_schema_1.UserUpdateWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedUpdateWithoutPostsInput_schema_1.UserUncheckedUpdateWithoutPostsInputObjectSchema),
    ]),
})
    .strict();
exports.UserUpdateToOneWithWhereWithoutPostsInputObjectSchema = Schema;
//# sourceMappingURL=UserUpdateToOneWithWhereWithoutPostsInput.schema.js.map