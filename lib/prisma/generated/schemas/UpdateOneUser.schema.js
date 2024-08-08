"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateOneSchema = void 0;
const zod_1 = require("zod");
const UserSelect_schema_1 = require("./objects/UserSelect.schema");
const UserInclude_schema_1 = require("./objects/UserInclude.schema");
const UserUpdateInput_schema_1 = require("./objects/UserUpdateInput.schema");
const UserUncheckedUpdateInput_schema_1 = require("./objects/UserUncheckedUpdateInput.schema");
const UserWhereUniqueInput_schema_1 = require("./objects/UserWhereUniqueInput.schema");
exports.UserUpdateOneSchema = zod_1.z.object({
    select: UserSelect_schema_1.UserSelectObjectSchema.optional(),
    include: UserInclude_schema_1.UserIncludeObjectSchema.optional(),
    data: zod_1.z.union([
        UserUpdateInput_schema_1.UserUpdateInputObjectSchema,
        UserUncheckedUpdateInput_schema_1.UserUncheckedUpdateInputObjectSchema,
    ]),
    where: UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema,
});
//# sourceMappingURL=UpdateOneUser.schema.js.map