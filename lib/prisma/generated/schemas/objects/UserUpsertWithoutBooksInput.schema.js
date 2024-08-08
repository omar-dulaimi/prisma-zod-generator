"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpsertWithoutBooksInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserUpdateWithoutBooksInput_schema_1 = require("./UserUpdateWithoutBooksInput.schema");
const UserUncheckedUpdateWithoutBooksInput_schema_1 = require("./UserUncheckedUpdateWithoutBooksInput.schema");
const UserCreateWithoutBooksInput_schema_1 = require("./UserCreateWithoutBooksInput.schema");
const UserUncheckedCreateWithoutBooksInput_schema_1 = require("./UserUncheckedCreateWithoutBooksInput.schema");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    update: zod_1.z.union([
        zod_1.z.lazy(() => UserUpdateWithoutBooksInput_schema_1.UserUpdateWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedUpdateWithoutBooksInput_schema_1.UserUncheckedUpdateWithoutBooksInputObjectSchema),
    ]),
    create: zod_1.z.union([
        zod_1.z.lazy(() => UserCreateWithoutBooksInput_schema_1.UserCreateWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedCreateWithoutBooksInput_schema_1.UserUncheckedCreateWithoutBooksInputObjectSchema),
    ]),
    where: zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema).optional(),
})
    .strict();
exports.UserUpsertWithoutBooksInputObjectSchema = Schema;
//# sourceMappingURL=UserUpsertWithoutBooksInput.schema.js.map