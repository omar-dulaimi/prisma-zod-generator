"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateManySchema = void 0;
const zod_1 = require("zod");
const UserCreateManyInput_schema_1 = require("./objects/UserCreateManyInput.schema");
exports.UserCreateManySchema = zod_1.z.object({
    data: zod_1.z.union([
        UserCreateManyInput_schema_1.UserCreateManyInputObjectSchema,
        zod_1.z.array(UserCreateManyInput_schema_1.UserCreateManyInputObjectSchema),
    ]),
    skipDuplicates: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=CreateManyUser.schema.js.map