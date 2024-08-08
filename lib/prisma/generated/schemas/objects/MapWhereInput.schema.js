"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapWhereInputObjectSchema = void 0;
const zod_1 = require("zod");
const StringFilter_schema_1 = require("./StringFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.MapWhereInputObjectSchema),
        zod_1.z.lazy(() => exports.MapWhereInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => exports.MapWhereInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => exports.MapWhereInputObjectSchema),
        zod_1.z.lazy(() => exports.MapWhereInputObjectSchema).array(),
    ])
        .optional(),
    key: zod_1.z
        .union([zod_1.z.lazy(() => StringFilter_schema_1.StringFilterObjectSchema), zod_1.z.string()])
        .optional(),
    value: zod_1.z
        .union([zod_1.z.lazy(() => StringFilter_schema_1.StringFilterObjectSchema), zod_1.z.string()])
        .optional(),
})
    .strict();
exports.MapWhereInputObjectSchema = Schema;
//# sourceMappingURL=MapWhereInput.schema.js.map