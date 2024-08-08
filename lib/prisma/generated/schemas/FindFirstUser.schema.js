"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFindFirstSchema = void 0;
const zod_1 = require("zod");
const UserSelect_schema_1 = require("./objects/UserSelect.schema");
const UserInclude_schema_1 = require("./objects/UserInclude.schema");
const UserOrderByWithRelationInput_schema_1 = require("./objects/UserOrderByWithRelationInput.schema");
const UserWhereInput_schema_1 = require("./objects/UserWhereInput.schema");
const UserWhereUniqueInput_schema_1 = require("./objects/UserWhereUniqueInput.schema");
const UserScalarFieldEnum_schema_1 = require("./enums/UserScalarFieldEnum.schema");
exports.UserFindFirstSchema = zod_1.z.object({
    select: UserSelect_schema_1.UserSelectObjectSchema.optional(),
    include: UserInclude_schema_1.UserIncludeObjectSchema.optional(),
    orderBy: zod_1.z
        .union([
        UserOrderByWithRelationInput_schema_1.UserOrderByWithRelationInputObjectSchema,
        UserOrderByWithRelationInput_schema_1.UserOrderByWithRelationInputObjectSchema.array(),
    ])
        .optional(),
    where: UserWhereInput_schema_1.UserWhereInputObjectSchema.optional(),
    cursor: UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    distinct: zod_1.z.array(UserScalarFieldEnum_schema_1.UserScalarFieldEnumSchema).optional(),
});
//# sourceMappingURL=FindFirstUser.schema.js.map