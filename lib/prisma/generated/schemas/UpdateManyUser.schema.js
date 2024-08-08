"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateManySchema = void 0;
const zod_1 = require("zod");
const UserUpdateManyMutationInput_schema_1 = require("./objects/UserUpdateManyMutationInput.schema");
const UserWhereInput_schema_1 = require("./objects/UserWhereInput.schema");
exports.UserUpdateManySchema = zod_1.z.object({
    data: UserUpdateManyMutationInput_schema_1.UserUpdateManyMutationInputObjectSchema,
    where: UserWhereInput_schema_1.UserWhereInputObjectSchema.optional(),
});
//# sourceMappingURL=UpdateManyUser.schema.js.map