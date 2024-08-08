"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostDeleteManySchema = void 0;
const zod_1 = require("zod");
const PostWhereInput_schema_1 = require("./objects/PostWhereInput.schema");
exports.PostDeleteManySchema = zod_1.z.object({
    where: PostWhereInput_schema_1.PostWhereInputObjectSchema.optional(),
});
//# sourceMappingURL=DeleteManyPost.schema.js.map