"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCreateManySchema = void 0;
const zod_1 = require("zod");
const PostCreateManyInput_schema_1 = require("./objects/PostCreateManyInput.schema");
exports.PostCreateManySchema = zod_1.z.object({
    data: zod_1.z.union([
        PostCreateManyInput_schema_1.PostCreateManyInputObjectSchema,
        zod_1.z.array(PostCreateManyInput_schema_1.PostCreateManyInputObjectSchema),
    ]),
    skipDuplicates: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=CreateManyPost.schema.js.map