"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDeleteOneSchema = void 0;
const zod_1 = require("zod");
const UserSelect_schema_1 = require("./objects/UserSelect.schema");
const UserInclude_schema_1 = require("./objects/UserInclude.schema");
const UserWhereUniqueInput_schema_1 = require("./objects/UserWhereUniqueInput.schema");
exports.UserDeleteOneSchema = zod_1.z.object({
    select: UserSelect_schema_1.UserSelectObjectSchema.optional(),
    include: UserInclude_schema_1.UserIncludeObjectSchema.optional(),
    where: UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema,
});
//# sourceMappingURL=DeleteOneUser.schema.js.map