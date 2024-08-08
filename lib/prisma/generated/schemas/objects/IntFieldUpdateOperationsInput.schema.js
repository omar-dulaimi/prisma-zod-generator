"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntFieldUpdateOperationsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    set: zod_1.z.number().optional(),
    increment: zod_1.z.number().optional(),
    decrement: zod_1.z.number().optional(),
    multiply: zod_1.z.number().optional(),
    divide: zod_1.z.number().optional(),
})
    .strict();
exports.IntFieldUpdateOperationsInputObjectSchema = Schema;
//# sourceMappingURL=IntFieldUpdateOperationsInput.schema.js.map