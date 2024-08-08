"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateNestedOneWithoutPostsInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserCreateWithoutPostsInput_schema_1 = require("./UserCreateWithoutPostsInput.schema");
const UserUncheckedCreateWithoutPostsInput_schema_1 = require("./UserUncheckedCreateWithoutPostsInput.schema");
const UserCreateOrConnectWithoutPostsInput_schema_1 = require("./UserCreateOrConnectWithoutPostsInput.schema");
const UserWhereUniqueInput_schema_1 = require("./UserWhereUniqueInput.schema");
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
    connect: zod_1.z.lazy(() => UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema).optional(),
})
    .strict();
exports.UserCreateNestedOneWithoutPostsInputObjectSchema = Schema;
//# sourceMappingURL=UserCreateNestedOneWithoutPostsInput.schema.js.map