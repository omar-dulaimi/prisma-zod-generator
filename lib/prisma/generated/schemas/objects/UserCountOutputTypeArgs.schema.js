"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCountOutputTypeArgsObjectSchema = void 0;
const zod_1 = require("zod");
const UserCountOutputTypeSelect_schema_1 = require("./UserCountOutputTypeSelect.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    select: zod_1.z.lazy(() => UserCountOutputTypeSelect_schema_1.UserCountOutputTypeSelectObjectSchema).optional(),
})
    .strict();
exports.UserCountOutputTypeArgsObjectSchema = Schema;
//# sourceMappingURL=UserCountOutputTypeArgs.schema.js.map