"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedBoolFilterObjectSchema = void 0;
const zod_1 = require("zod");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.boolean().optional(),
    not: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.lazy(() => exports.NestedBoolFilterObjectSchema)])
        .optional(),
})
    .strict();
exports.NestedBoolFilterObjectSchema = Schema;
//# sourceMappingURL=NestedBoolFilter.schema.js.map