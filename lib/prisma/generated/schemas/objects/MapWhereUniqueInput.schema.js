"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapWhereUniqueInputObjectSchema = void 0;
const zod_1 = require("zod");
const MapWhereInput_schema_1 = require("./MapWhereInput.schema");
const StringFilter_schema_1 = require("./StringFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    key: zod_1.z.string().optional(),
    AND: zod_1.z
        .union([
        zod_1.z.lazy(() => MapWhereInput_schema_1.MapWhereInputObjectSchema),
        zod_1.z.lazy(() => MapWhereInput_schema_1.MapWhereInputObjectSchema).array(),
    ])
        .optional(),
    OR: zod_1.z
        .lazy(() => MapWhereInput_schema_1.MapWhereInputObjectSchema)
        .array()
        .optional(),
    NOT: zod_1.z
        .union([
        zod_1.z.lazy(() => MapWhereInput_schema_1.MapWhereInputObjectSchema),
        zod_1.z.lazy(() => MapWhereInput_schema_1.MapWhereInputObjectSchema).array(),
    ])
        .optional(),
    value: zod_1.z
        .union([zod_1.z.lazy(() => StringFilter_schema_1.StringFilterObjectSchema), zod_1.z.string()])
        .optional(),
})
    .strict();
exports.MapWhereUniqueInputObjectSchema = Schema;
//# sourceMappingURL=MapWhereUniqueInput.schema.js.map