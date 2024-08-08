"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostArgsObjectSchema = void 0;
const zod_1 = require("zod");
const PostSelect_schema_1 = require("./PostSelect.schema");
const PostInclude_schema_1 = require("./PostInclude.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    select: zod_1.z.lazy(() => PostSelect_schema_1.PostSelectObjectSchema).optional(),
    include: zod_1.z.lazy(() => PostInclude_schema_1.PostIncludeObjectSchema).optional(),
})
    .strict();
exports.PostArgsObjectSchema = Schema;
//# sourceMappingURL=PostArgs.schema.js.map