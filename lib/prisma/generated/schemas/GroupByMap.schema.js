"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapGroupBySchema = void 0;
const zod_1 = require("zod");
const MapWhereInput_schema_1 = require("./objects/MapWhereInput.schema");
const MapOrderByWithAggregationInput_schema_1 = require("./objects/MapOrderByWithAggregationInput.schema");
const MapScalarWhereWithAggregatesInput_schema_1 = require("./objects/MapScalarWhereWithAggregatesInput.schema");
const MapScalarFieldEnum_schema_1 = require("./enums/MapScalarFieldEnum.schema");
exports.MapGroupBySchema = zod_1.z.object({
    where: MapWhereInput_schema_1.MapWhereInputObjectSchema.optional(),
    orderBy: zod_1.z
        .union([
        MapOrderByWithAggregationInput_schema_1.MapOrderByWithAggregationInputObjectSchema,
        MapOrderByWithAggregationInput_schema_1.MapOrderByWithAggregationInputObjectSchema.array(),
    ])
        .optional(),
    having: MapScalarWhereWithAggregatesInput_schema_1.MapScalarWhereWithAggregatesInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    by: zod_1.z.array(MapScalarFieldEnum_schema_1.MapScalarFieldEnumSchema),
});
//# sourceMappingURL=GroupByMap.schema.js.map