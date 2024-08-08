"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringFieldUpdateOperationsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    set: zod_1.z.string().optional(),
})
    .strict();
exports.StringFieldUpdateOperationsInputObjectSchema = Schema;
//# sourceMappingURL=StringFieldUpdateOperationsInput.schema.js.map