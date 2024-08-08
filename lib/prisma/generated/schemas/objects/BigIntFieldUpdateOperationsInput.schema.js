"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigIntFieldUpdateOperationsInputObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    set: zod_1.z.bigint().optional(),
    increment: zod_1.z.bigint().optional(),
    decrement: zod_1.z.bigint().optional(),
    multiply: zod_1.z.bigint().optional(),
    divide: zod_1.z.bigint().optional(),
})
    .strict();
exports.BigIntFieldUpdateOperationsInputObjectSchema = Schema;
//# sourceMappingURL=BigIntFieldUpdateOperationsInput.schema.js.map