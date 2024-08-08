"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUpdateManyWithWhereWithoutAuthorInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostScalarWhereInput_schema_1 = require("./PostScalarWhereInput.schema");
const PostUpdateManyMutationInput_schema_1 = require("./PostUpdateManyMutationInput.schema");
const PostUncheckedUpdateManyWithoutAuthorInput_schema_1 = require("./PostUncheckedUpdateManyWithoutAuthorInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => PostScalarWhereInput_schema_1.PostScalarWhereInputObjectSchema),
    data: zod_1.z.union([
        zod_1.z.lazy(() => PostUpdateManyMutationInput_schema_1.PostUpdateManyMutationInputObjectSchema),
        zod_1.z.lazy(() => PostUncheckedUpdateManyWithoutAuthorInput_schema_1.PostUncheckedUpdateManyWithoutAuthorInputObjectSchema),
    ]),
})
    .strict();
exports.PostUpdateManyWithWhereWithoutAuthorInputObjectSchema = Schema;
//# sourceMappingURL=PostUpdateManyWithWhereWithoutAuthorInput.schema.js.map