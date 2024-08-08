"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateNestedOneWithoutBooksInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserCreateWithoutBooksInput_schema_1 = require("./UserCreateWithoutBooksInput.schema");
const UserUncheckedCreateWithoutBooksInput_schema_1 = require("./UserUncheckedCreateWithoutBooksInput.schema");
const UserCreateOrConnectWithoutBooksInput_schema_1 = require("./UserCreateOrConnectWithoutBooksInput.schema");
const UserWhereUniqueInput_schema_1 = require("./UserWhereUniqueInput.schema");
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
    connect: zod_1.z.lazy(() => UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema).optional(),
})
    .strict();
exports.UserCreateNestedOneWithoutBooksInputObjectSchema = Schema;
//# sourceMappingURL=UserCreateNestedOneWithoutBooksInput.schema.js.map