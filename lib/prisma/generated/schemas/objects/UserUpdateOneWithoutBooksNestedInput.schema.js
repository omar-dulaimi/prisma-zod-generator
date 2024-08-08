"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateOneWithoutBooksNestedInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserCreateWithoutBooksInput_schema_1 = require("./UserCreateWithoutBooksInput.schema");
const UserUncheckedCreateWithoutBooksInput_schema_1 = require("./UserUncheckedCreateWithoutBooksInput.schema");
const UserCreateOrConnectWithoutBooksInput_schema_1 = require("./UserCreateOrConnectWithoutBooksInput.schema");
const UserUpsertWithoutBooksInput_schema_1 = require("./UserUpsertWithoutBooksInput.schema");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
const UserWhereUniqueInput_schema_1 = require("./UserWhereUniqueInput.schema");
const UserUpdateToOneWithWhereWithoutBooksInput_schema_1 = require("./UserUpdateToOneWithWhereWithoutBooksInput.schema");
const UserUpdateWithoutBooksInput_schema_1 = require("./UserUpdateWithoutBooksInput.schema");
const UserUncheckedUpdateWithoutBooksInput_schema_1 = require("./UserUncheckedUpdateWithoutBooksInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    create: zod_1.z
        .union([
        zod_1.z.lazy(() => UserCreateWithoutBooksInput_schema_1.UserCreateWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedCreateWithoutBooksInput_schema_1.UserUncheckedCreateWithoutBooksInputObjectSchema),
    ])
        .optional(),
    connectOrCreate: zod_1.z
        .lazy(() => UserCreateOrConnectWithoutBooksInput_schema_1.UserCreateOrConnectWithoutBooksInputObjectSchema)
        .optional(),
    upsert: zod_1.z.lazy(() => UserUpsertWithoutBooksInput_schema_1.UserUpsertWithoutBooksInputObjectSchema).optional(),
    disconnect: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)])
        .optional(),
    delete: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)])
        .optional(),
    connect: zod_1.z.lazy(() => UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema).optional(),
    update: zod_1.z
        .union([
        zod_1.z.lazy(() => UserUpdateToOneWithWhereWithoutBooksInput_schema_1.UserUpdateToOneWithWhereWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUpdateWithoutBooksInput_schema_1.UserUpdateWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedUpdateWithoutBooksInput_schema_1.UserUncheckedUpdateWithoutBooksInputObjectSchema),
    ])
        .optional(),
})
    .strict();
exports.UserUpdateOneWithoutBooksNestedInputObjectSchema = Schema;
//# sourceMappingURL=UserUpdateOneWithoutBooksNestedInput.schema.js.map