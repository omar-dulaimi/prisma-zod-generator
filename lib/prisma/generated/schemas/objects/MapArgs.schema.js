"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapArgsObjectSchema = void 0;
const zod_1 = require("zod");
const MapSelect_schema_1 = require("./MapSelect.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    select: zod_1.z.lazy(() => MapSelect_schema_1.MapSelectObjectSchema).optional(),
})
    .strict();
exports.MapArgsObjectSchema = Schema;
//# sourceMappingURL=MapArgs.schema.js.map