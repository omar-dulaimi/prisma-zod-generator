"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapUncheckedUpdateManyInputObjectSchema = void 0;
const zod_1 = require("zod");
const StringFieldUpdateOperationsInput_schema_1 = require("./StringFieldUpdateOperationsInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.lazy(() => StringFieldUpdateOperationsInput_schema_1.StringFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    value: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.lazy(() => StringFieldUpdateOperationsInput_schema_1.StringFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
})
    .strict();
exports.MapUncheckedUpdateManyInputObjectSchema = Schema;
//# sourceMappingURL=MapUncheckedUpdateManyInput.schema.js.map