"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateOneSchema = void 0;
const zod_1 = require("zod");
const UserSelect_schema_1 = require("./objects/UserSelect.schema");
const UserInclude_schema_1 = require("./objects/UserInclude.schema");
const UserCreateInput_schema_1 = require("./objects/UserCreateInput.schema");
const UserUncheckedCreateInput_schema_1 = require("./objects/UserUncheckedCreateInput.schema");
exports.UserCreateOneSchema = zod_1.z.object({
    select: UserSelect_schema_1.UserSelectObjectSchema.optional(),
    include: UserInclude_schema_1.UserIncludeObjectSchema.optional(),
    data: zod_1.z.union([
        UserCreateInput_schema_1.UserCreateInputObjectSchema,
        UserUncheckedCreateInput_schema_1.UserUncheckedCreateInputObjectSchema,
    ]),
});
//# sourceMappingURL=CreateOneUser.schema.js.map