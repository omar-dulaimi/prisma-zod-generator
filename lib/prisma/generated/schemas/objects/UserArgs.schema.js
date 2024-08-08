"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserArgsObjectSchema = void 0;
const zod_1 = require("zod");
const UserSelect_schema_1 = require("./UserSelect.schema");
const UserInclude_schema_1 = require("./UserInclude.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    select: zod_1.z.lazy(() => UserSelect_schema_1.UserSelectObjectSchema).optional(),
    include: zod_1.z.lazy(() => UserInclude_schema_1.UserIncludeObjectSchema).optional(),
})
    .strict();
exports.UserArgsObjectSchema = Schema;
//# sourceMappingURL=UserArgs.schema.js.map