"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateOrConnectWithoutPostsInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserWhereUniqueInput_schema_1 = require("./UserWhereUniqueInput.schema");
const UserCreateWithoutPostsInput_schema_1 = require("./UserCreateWithoutPostsInput.schema");
const UserUncheckedCreateWithoutPostsInput_schema_1 = require("./UserUncheckedCreateWithoutPostsInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema),
    create: zod_1.z.union([
        zod_1.z.lazy(() => UserCreateWithoutPostsInput_schema_1.UserCreateWithoutPostsInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedCreateWithoutPostsInput_schema_1.UserUncheckedCreateWithoutPostsInputObjectSchema),
    ]),
})
    .strict();
exports.UserCreateOrConnectWithoutPostsInputObjectSchema = Schema;
//# sourceMappingURL=UserCreateOrConnectWithoutPostsInput.schema.js.map