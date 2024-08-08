"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUncheckedUpdateManyWithoutAuthorInputObjectSchema = void 0;
const zod_1 = require("zod");
const IntFieldUpdateOperationsInput_schema_1 = require("./IntFieldUpdateOperationsInput.schema");
const DateTimeFieldUpdateOperationsInput_schema_1 = require("./DateTimeFieldUpdateOperationsInput.schema");
const StringFieldUpdateOperationsInput_schema_1 = require("./StringFieldUpdateOperationsInput.schema");
const NullableStringFieldUpdateOperationsInput_schema_1 = require("./NullableStringFieldUpdateOperationsInput.schema");
const BoolFieldUpdateOperationsInput_schema_1 = require("./BoolFieldUpdateOperationsInput.schema");
const BigIntFieldUpdateOperationsInput_schema_1 = require("./BigIntFieldUpdateOperationsInput.schema");
const BytesFieldUpdateOperationsInput_schema_1 = require("./BytesFieldUpdateOperationsInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z
        .union([
        zod_1.z.number(),
        zod_1.z.lazy(() => IntFieldUpdateOperationsInput_schema_1.IntFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    createdAt: zod_1.z
        .union([
        zod_1.z.coerce.date(),
        zod_1.z.lazy(() => DateTimeFieldUpdateOperationsInput_schema_1.DateTimeFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    updatedAt: zod_1.z
        .union([
        zod_1.z.coerce.date(),
        zod_1.z.lazy(() => DateTimeFieldUpdateOperationsInput_schema_1.DateTimeFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    title: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.lazy(() => StringFieldUpdateOperationsInput_schema_1.StringFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    content: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.lazy(() => NullableStringFieldUpdateOperationsInput_schema_1.NullableStringFieldUpdateOperationsInputObjectSchema),
    ])
        .optional()
        .nullable(),
    published: zod_1.z
        .union([
        zod_1.z.boolean(),
        zod_1.z.lazy(() => BoolFieldUpdateOperationsInput_schema_1.BoolFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    viewCount: zod_1.z
        .union([
        zod_1.z.number(),
        zod_1.z.lazy(() => IntFieldUpdateOperationsInput_schema_1.IntFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    likes: zod_1.z
        .union([
        zod_1.z.bigint(),
        zod_1.z.lazy(() => BigIntFieldUpdateOperationsInput_schema_1.BigIntFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    bytes: zod_1.z
        .union([
        zod_1.z.instanceof(Buffer),
        zod_1.z.lazy(() => BytesFieldUpdateOperationsInput_schema_1.BytesFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
})
    .strict();
exports.PostUncheckedUpdateManyWithoutAuthorInputObjectSchema = Schema;
//# sourceMappingURL=PostUncheckedUpdateManyWithoutAuthorInput.schema.js.map