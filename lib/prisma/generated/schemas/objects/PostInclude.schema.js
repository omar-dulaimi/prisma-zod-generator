"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostIncludeObjectSchema = void 0;
const zod_1 = require("zod");
const UserArgs_schema_1 = require("./UserArgs.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    author: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserArgs_schema_1.UserArgsObjectSchema)])
        .optional(),
})
    .strict();
exports.PostIncludeObjectSchema = Schema;
//# sourceMappingURL=PostInclude.schema.js.map