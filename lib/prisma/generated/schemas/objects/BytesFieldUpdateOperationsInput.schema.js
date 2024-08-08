"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytesFieldUpdateOperationsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    set: zod_1.z.instanceof(Buffer).optional(),
})
    .strict();
exports.BytesFieldUpdateOperationsInputObjectSchema = Schema;
//# sourceMappingURL=BytesFieldUpdateOperationsInput.schema.js.map