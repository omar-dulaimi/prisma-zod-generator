"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullableStringFieldUpdateOperationsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    set: zod_1.z.string().optional().nullable(),
})
    .strict();
exports.NullableStringFieldUpdateOperationsInputObjectSchema = Schema;
//# sourceMappingURL=NullableStringFieldUpdateOperationsInput.schema.js.map