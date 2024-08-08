"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapSelectObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.boolean().optional(),
    value: zod_1.z.boolean().optional(),
})
    .strict();
exports.MapSelectObjectSchema = Schema;
//# sourceMappingURL=MapSelect.schema.js.map