"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapUpdateOneSchema = void 0;
const zod_1 = require("zod");
const MapSelect_schema_1 = require("./objects/MapSelect.schema");
const MapUpdateInput_schema_1 = require("./objects/MapUpdateInput.schema");
const MapUncheckedUpdateInput_schema_1 = require("./objects/MapUncheckedUpdateInput.schema");
const MapWhereUniqueInput_schema_1 = require("./objects/MapWhereUniqueInput.schema");
exports.MapUpdateOneSchema = zod_1.z.object({
    select: MapSelect_schema_1.MapSelectObjectSchema.optional(),
    data: zod_1.z.union([
        MapUpdateInput_schema_1.MapUpdateInputObjectSchema,
        MapUncheckedUpdateInput_schema_1.MapUncheckedUpdateInputObjectSchema,
    ]),
    where: MapWhereUniqueInput_schema_1.MapWhereUniqueInputObjectSchema,
});
//# sourceMappingURL=UpdateOneMap.schema.js.map