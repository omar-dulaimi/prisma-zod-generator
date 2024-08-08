"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreateInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostCreateNestedManyWithoutAuthorInput_schema_1 = require("./PostCreateNestedManyWithoutAuthorInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    email: zod_1.z.string(),
    name: zod_1.z.string().optional().nullable(),
    posts: zod_1.z
        .lazy(() => PostCreateNestedManyWithoutAuthorInput_schema_1.PostCreateNestedManyWithoutAuthorInputObjectSchema)
        .optional(),
})
    .strict();
exports.UserCreateInputObjectSchema = Schema;
//# sourceMappingURL=UserCreateInput.schema.js.map