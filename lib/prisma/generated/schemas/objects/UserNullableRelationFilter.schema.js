"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserNullableRelationFilterObjectSchema = void 0;
const zod_1 = require("zod");
const UserWhereInput_schema_1 = require("./UserWhereInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    is: zod_1.z
        .lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)
        .optional()
        .nullable(),
    isNot: zod_1.z
        .lazy(() => UserWhereInput_schema_1.UserWhereInputObjectSchema)
        .optional()
        .nullable(),
})
    .strict();
exports.UserNullableRelationFilterObjectSchema = Schema;
//# sourceMappingURL=UserNullableRelationFilter.schema.js.map