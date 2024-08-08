"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpsertSchema = void 0;
const zod_1 = require("zod");
const UserSelect_schema_1 = require("./objects/UserSelect.schema");
const UserInclude_schema_1 = require("./objects/UserInclude.schema");
const UserWhereUniqueInput_schema_1 = require("./objects/UserWhereUniqueInput.schema");
const UserCreateInput_schema_1 = require("./objects/UserCreateInput.schema");
const UserUncheckedCreateInput_schema_1 = require("./objects/UserUncheckedCreateInput.schema");
const UserUpdateInput_schema_1 = require("./objects/UserUpdateInput.schema");
const UserUncheckedUpdateInput_schema_1 = require("./objects/UserUncheckedUpdateInput.schema");
exports.UserUpsertSchema = zod_1.z.object({
    select: UserSelect_schema_1.UserSelectObjectSchema.optional(),
    include: UserInclude_schema_1.UserIncludeObjectSchema.optional(),
    where: UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema,
    create: zod_1.z.union([
        UserCreateInput_schema_1.UserCreateInputObjectSchema,
        UserUncheckedCreateInput_schema_1.UserUncheckedCreateInputObjectSchema,
    ]),
    update: zod_1.z.union([
        UserUpdateInput_schema_1.UserUpdateInputObjectSchema,
        UserUncheckedUpdateInput_schema_1.UserUncheckedUpdateInputObjectSchema,
    ]),
});
//# sourceMappingURL=UpsertOneUser.schema.js.map