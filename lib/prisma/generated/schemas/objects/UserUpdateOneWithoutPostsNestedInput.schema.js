"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateOneWithoutPostsNestedInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserCreateWithoutPostsInput_schema_1 = require("./UserCreateWithoutPostsInput.schema");
const UserUncheckedCreateWithoutPostsInput_schema_1 = require("./UserUncheckedCreateWithoutPostsInput.schema");
const UserCreateOrConnectWithoutPostsInput_schema_1 = require("./UserCreateOrConnectWithoutPostsInput.schema");
const UserUpsertWithoutPostsInput_schema_1 = require("./UserUpsertWithoutPostsInput.schema");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
const UserWhereUniqueInput_schema_1 = require("./UserWhereUniqueInput.schema");
const UserUpdateToOneWithWhereWithoutPostsInput_schema_1 = require("./UserUpdateToOneWithWhereWithoutPostsInput.schema");
const UserUpdateWithoutPostsInput_schema_1 = require("./UserUpdateWithoutPostsInput.schema");
const UserUncheckedUpdateWithoutPostsInput_schema_1 = require("./UserUncheckedUpdateWithoutPostsInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    create: zod_1.z
        .union([
        zod_1.z.lazy(() => UserCreateWithoutPostsInput_schema_1.UserCreateWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedCreateWithoutPostsInput_schema_1.UserUncheckedCreateWithoutPostsInputObjectSchema),
    ])
        .optional(),
    connectOrCreate: zod_1.z
        .lazy(() => UserCreateOrConnectWithoutPostsInput_schema_1.UserCreateOrConnectWithoutPostsInputObjectSchema)
        .optional(),
    upsert: zod_1.z.lazy(() => UserUpsertWithoutPostsInput_schema_1.UserUpsertWithoutPostsInputObjectSchema).optional(),
    disconnect: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)])
        .optional(),
    delete: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)])
        .optional(),
    connect: zod_1.z.lazy(() => UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema).optional(),
    update: zod_1.z
        .union([
        zod_1.z.lazy(() => UserUpdateToOneWithWhereWithoutPostsInput_schema_1.UserUpdateToOneWithWhereWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUpdateWithoutPostsInput_schema_1.UserUpdateWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedUpdateWithoutPostsInput_schema_1.UserUncheckedUpdateWithoutPostsInputObjectSchema),
    ])
        .optional(),
})
    .strict();
exports.UserUpdateOneWithoutPostsNestedInputObjectSchema = Schema;
//# sourceMappingURL=UserUpdateOneWithoutPostsNestedInput.schema.js.map