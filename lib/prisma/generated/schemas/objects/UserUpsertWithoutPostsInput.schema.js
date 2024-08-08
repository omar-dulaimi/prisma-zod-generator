"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpsertWithoutPostsInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserUpdateWithoutPostsInput_schema_1 = require("./UserUpdateWithoutPostsInput.schema");
const UserUncheckedUpdateWithoutPostsInput_schema_1 = require("./UserUncheckedUpdateWithoutPostsInput.schema");
const UserCreateWithoutPostsInput_schema_1 = require("./UserCreateWithoutPostsInput.schema");
const UserUncheckedCreateWithoutPostsInput_schema_1 = require("./UserUncheckedCreateWithoutPostsInput.schema");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    update: zod_1.z.union([
        zod_1.z.lazy(() => UserUpdateWithoutPostsInput_schema_1.UserUpdateWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedUpdateWithoutPostsInput_schema_1.UserUncheckedUpdateWithoutPostsInputObjectSchema),
    ]),
    create: zod_1.z.union([
        zod_1.z.lazy(() => UserCreateWithoutPostsInput_schema_1.UserCreateWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedCreateWithoutPostsInput_schema_1.UserUncheckedCreateWithoutPostsInputObjectSchema),
    ]),
    where: zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema).optional(),
})
    .strict();
exports.UserUpsertWithoutPostsInputObjectSchema = Schema;
//# sourceMappingURL=UserUpsertWithoutPostsInput.schema.js.map