"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapUpsertSchema = void 0;
const zod_1 = require("zod");
const MapSelect_schema_1 = require("./objects/MapSelect.schema");
const MapWhereUniqueInput_schema_1 = require("./objects/MapWhereUniqueInput.schema");
const MapCreateInput_schema_1 = require("./objects/MapCreateInput.schema");
const MapUncheckedCreateInput_schema_1 = require("./objects/MapUncheckedCreateInput.schema");
const MapUpdateInput_schema_1 = require("./objects/MapUpdateInput.schema");
const MapUncheckedUpdateInput_schema_1 = require("./objects/MapUncheckedUpdateInput.schema");
exports.MapUpsertSchema = zod_1.z.object({
    select: MapSelect_schema_1.MapSelectObjectSchema.optional(),
    where: MapWhereUniqueInput_schema_1.MapWhereUniqueInputObjectSchema,
    create: zod_1.z.union([
        MapCreateInput_schema_1.MapCreateInputObjectSchema,
        MapUncheckedCreateInput_schema_1.MapUncheckedCreateInputObjectSchema,
    ]),
    update: zod_1.z.union([
        MapUpdateInput_schema_1.MapUpdateInputObjectSchema,
        MapUncheckedUpdateInput_schema_1.MapUncheckedUpdateInputObjectSchema,
    ]),
});
//# sourceMappingURL=UpsertOneMap.schema.js.map