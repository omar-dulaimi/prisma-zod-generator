"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateToOneWithWhereWithoutBooksInputObjectSchema = void 0;
const zod_1 = require("zod");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
const UserUpdateWithoutBooksInput_schema_1 = require("./UserUpdateWithoutBooksInput.schema");
const UserUncheckedUpdateWithoutBooksInput_schema_1 = require("./UserUncheckedUpdateWithoutBooksInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema).optional(),
    data: zod_1.z.union([
        zod_1.z.lazy(() => UserUpdateWithoutBooksInput_schema_1.UserUpdateWithoutBooksInputObjectSchema),
        zod_1.z.lazy(() => UserUncheckedUpdateWithoutBooksInput_schema_1.UserUncheckedUpdateWithoutBooksInputObjectSchema),
    ]),
})
    .strict();
exports.UserUpdateToOneWithWhereWithoutBooksInputObjectSchema = Schema;
//# sourceMappingURL=UserUpdateToOneWithWhereWithoutBooksInput.schema.js.map