"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateOrConnectWithoutBooksInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserWhereUniqueInput_schema_1 = require("./UserWhereUniqueInput.schema");
const UserCreateWithoutBooksInput_schema_1 = require("./UserCreateWithoutBooksInput.schema");
const UserUncheckedCreateWithoutBooksInput_schema_1 = require("./UserUncheckedCreateWithoutBooksInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema),
    create: zod_1.z.union([
        zod_1.z.lazy(() => UserCreateWithoutBooksInput_schema_1.UserCreateWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedCreateWithoutBooksInput_schema_1.UserUncheckedCreateWithoutBooksInputObjectSchema),
    ]),
})
    .strict();
exports.UserCreateOrConnectWithoutBooksInputObjectSchema = Schema;
//# sourceMappingURL=UserCreateOrConnectWithoutBooksInput.schema.js.map