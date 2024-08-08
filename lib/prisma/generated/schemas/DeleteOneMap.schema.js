"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapDeleteOneSchema = void 0;
const zod_1 = require("zod");
const MapSelect_schema_1 = require("./objects/MapSelect.schema");
const MapWhereUniqueInput_schema_1 = require("./objects/MapWhereUniqueInput.schema");
exports.MapDeleteOneSchema = zod_1.z.object({
    select: MapSelect_schema_1.MapSelectObjectSchema.optional(),
    where: MapWhereUniqueInput_schema_1.MapWhereUniqueInputObjectSchema,
});
//# sourceMappingURL=DeleteOneMap.schema.js.map