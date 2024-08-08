"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedBytesFilterObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.instanceof(Buffer).optional(),
    in: zod_1.z.instanceof(Buffer).array().optional(),
    notIn: zod_1.z.instanceof(Buffer).array().optional(),
    not: zod_1.z
        .union([
        zod_1.z.instanceof(Buffer),
        zod_1.z.lazy(() => exports.NestedBytesFilterObjectSchema),
    ])
        .optional(),
})
    .strict();
exports.NestedBytesFilterObjectSchema = Schema;
//# sourceMappingURL=NestedBytesFilter.schema.js.map