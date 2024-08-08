"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUncheckedCreateWithoutBooksInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostUncheckedCreateNestedManyWithoutAuthorInput_schema_1 = require("./PostUncheckedCreateNestedManyWithoutAuthorInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.number().optional(),
    email: zod_1.z.string(),
    name: zod_1.z.string().optional().nullable(),
    posts: zod_1.z
        .lazy(() => PostUncheckedCreateNestedManyWithoutAuthorInput_schema_1.PostUncheckedCreateNestedManyWithoutAuthorInputObjectSchema)
        .optional(),
})
    .strict();
exports.UserUncheckedCreateWithoutBooksInputObjectSchema = Schema;
//# sourceMappingURL=UserUncheckedCreateWithoutBooksInput.schema.js.map