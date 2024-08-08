"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoolFieldUpdateOperationsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    set: zod_1.z.boolean().optional(),
})
    .strict();
exports.BoolFieldUpdateOperationsInputObjectSchema = Schema;
//# sourceMappingURL=BoolFieldUpdateOperationsInput.schema.js.map