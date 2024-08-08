"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCountOutputTypeSelectObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    posts: zod_1.z.boolean().optional(),
})
    .strict();
exports.UserCountOutputTypeSelectObjectSchema = Schema;
//# sourceMappingURL=UserCountOutputTypeSelect.schema.js.map