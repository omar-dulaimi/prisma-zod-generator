"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserIncludeObjectSchema = void 0;
const zod_1 = require("zod");
const FindManyPost_schema_1 = require("../FindManyPost.schema");
const UserCountOutputTypeArgs_schema_1 = require("./UserCountOutputTypeArgs.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    posts: zod_1.z.union([zod_1.z.boolean(), zod_1.z.lazy(() => FindManyPost_schema_1.PostFindManySchema)]).optional(),
    _count: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserCountOutputTypeArgs_schema_1.UserCountOutputTypeArgsObjectSchema)])
        .optional(),
})
    .strict();
exports.UserIncludeObjectSchema = Schema;
//# sourceMappingURL=UserInclude.schema.js.map