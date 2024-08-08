"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDeleteManySchema = void 0;
const zod_1 = require("zod");
const UserWhereInput_schema_1 = require("./objects/UserWhereInput.schema");
exports.UserDeleteManySchema = zod_1.z.object({
    where: UserWhereInput_schema_1.UserWhereInputObjectSchema.optional(),
});
//# sourceMappingURL=DeleteManyUser.schema.js.map