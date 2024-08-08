"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUpdateManySchema = void 0;
const zod_1 = require("zod");
const PostUpdateManyMutationInput_schema_1 = require("./objects/PostUpdateManyMutationInput.schema");
const PostWhereInput_schema_1 = require("./objects/PostWhereInput.schema");
exports.PostUpdateManySchema = zod_1.z.object({
    data: PostUpdateManyMutationInput_schema_1.PostUpdateManyMutationInputObjectSchema,
    where: PostWhereInput_schema_1.PostWhereInputObjectSchema.optional(),
});
//# sourceMappingURL=UpdateManyPost.schema.js.map