"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytesFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedBytesFilter_schema_1 = require("./NestedBytesFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.instanceof(Buffer).optional(),
    in: zod_1.z.instanceof(Buffer).array().optional(),
    notIn: zod_1.z.instanceof(Buffer).array().optional(),
    not: zod_1.z
        .union([
        zod_1.z.instanceof(Buffer),
        zod_1.z.lazy(() => NestedBytesFilter_schema_1.NestedBytesFilterObjectSchema),
    ])
        .optional(),
})
    .strict();
exports.BytesFilterObjectSchema = Schema;
//# sourceMappingURL=BytesFilter.schema.js.map