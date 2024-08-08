"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringFilterObjectSchema = void 0;
const zod_1 = require("zod");
const NestedStringFilter_schema_1 = require("./NestedStringFilter.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    equals: zod_1.z.string().optional(),
    in: zod_1.z.string().array().optional(),
    notIn: zod_1.z.string().array().optional(),
    lt: zod_1.z.string().optional(),
    lte: zod_1.z.string().optional(),
    gt: zod_1.z.string().optional(),
    gte: zod_1.z.string().optional(),
    contains: zod_1.z.string().optional(),
    startsWith: zod_1.z.string().optional(),
    endsWith: zod_1.z.string().optional(),
    not: zod_1.z
        .union([zod_1.z.string(), zod_1.z.lazy(() => NestedStringFilter_schema_1.NestedStringFilterObjectSchema)])
        .optional(),
})
    .strict();
exports.StringFilterObjectSchema = Schema;
//# sourceMappingURL=StringFilter.schema.js.map