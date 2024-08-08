"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUncheckedUpdateWithoutBooksInputObjectSchema = void 0;
const zod_1 = require("zod");
const IntFieldUpdateOperationsInput_schema_1 = require("./IntFieldUpdateOperationsInput.schema");
const StringFieldUpdateOperationsInput_schema_1 = require("./StringFieldUpdateOperationsInput.schema");
const NullableStringFieldUpdateOperationsInput_schema_1 = require("./NullableStringFieldUpdateOperationsInput.schema");
const PostUncheckedUpdateManyWithoutAuthorNestedInput_schema_1 = require("./PostUncheckedUpdateManyWithoutAuthorNestedInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z
        .union([
        zod_1.z.number(),
        zod_1.z.lazy(() => IntFieldUpdateOperationsInput_schema_1.IntFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    email: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.lazy(() => StringFieldUpdateOperationsInput_schema_1.StringFieldUpdateOperationsInputObjectSchema),
    ])
        .optional(),
    name: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.lazy(() => NullableStringFieldUpdateOperationsInput_schema_1.NullableStringFieldUpdateOperationsInputObjectSchema),
    ])
        .optional()
        .nullable(),
    posts: zod_1.z
        .lazy(() => PostUncheckedUpdateManyWithoutAuthorNestedInput_schema_1.PostUncheckedUpdateManyWithoutAuthorNestedInputObjectSchema)
        .optional(),
})
    .strict();
exports.UserUncheckedUpdateWithoutBooksInputObjectSchema = Schema;
//# sourceMappingURL=UserUncheckedUpdateWithoutBooksInput.schema.js.map