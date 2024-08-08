"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapCreateOneSchema = void 0;
const zod_1 = require("zod");
const MapSelect_schema_1 = require("./objects/MapSelect.schema");
const MapCreateInput_schema_1 = require("./objects/MapCreateInput.schema");
const MapUncheckedCreateInput_schema_1 = require("./objects/MapUncheckedCreateInput.schema");
exports.MapCreateOneSchema = zod_1.z.object({
    select: MapSelect_schema_1.MapSelectObjectSchema.optional(),
    data: zod_1.z.union([
        MapCreateInput_schema_1.MapCreateInputObjectSchema,
        MapUncheckedCreateInput_schema_1.MapUncheckedCreateInputObjectSchema,
    ]),
});
//# sourceMappingURL=CreateOneMap.schema.js.map