"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapCreateManyInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.string(),
    value: zod_1.z.string(),
})
    .strict();
exports.MapCreateManyInputObjectSchema = Schema;
//# sourceMappingURL=MapCreateManyInput.schema.js.map