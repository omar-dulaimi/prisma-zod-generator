"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSelectObjectSchema = void 0;
const zod_1 = require("zod");
const FindManyPost_schema_1 = require("../FindManyPost.schema");
const UserCountOutputTypeArgs_schema_1 = require("./UserCountOutputTypeArgs.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.boolean().optional(),
    email: zod_1.z.boolean().optional(),
    name: zod_1.z.boolean().optional(),
    posts: zod_1.z.union([zod_1.z.boolean(), zod_1.z.lazy(() => FindManyPost_schema_1.PostFindManySchema)]).optional(),
    _count: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => UserCountOutputTypeArgs_schema_1.UserCountOutputTypeArgsObjectSchema)])
        .optional(),
})
    .strict();
exports.UserSelectObjectSchema = Schema;
//# sourceMappingURL=UserSelect.schema.js.map