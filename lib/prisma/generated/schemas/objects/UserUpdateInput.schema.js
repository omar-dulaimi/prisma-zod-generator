"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUpdateInputObjectSchema = void 0;
const zod_1 = require("zod");
const StringFieldUpdateOperationsInput_schema_1 = require("./StringFieldUpdateOperationsInput.schema");
const NullableStringFieldUpdateOperationsInput_schema_1 = require("./NullableStringFieldUpdateOperationsInput.schema");
const PostUpdateManyWithoutAuthorNestedInput_schema_1 = require("./PostUpdateManyWithoutAuthorNestedInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
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
        .lazy(() => PostUpdateManyWithoutAuthorNestedInput_schema_1.PostUpdateManyWithoutAuthorNestedInputObjectSchema)
        .optional(),
})
    .strict();
exports.UserUpdateInputObjectSchema = Schema;
//# sourceMappingURL=UserUpdateInput.schema.js.map