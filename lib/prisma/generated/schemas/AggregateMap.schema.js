"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapAggregateSchema = void 0;
const zod_1 = require("zod");
const MapOrderByWithRelationInput_schema_1 = require("./objects/MapOrderByWithRelationInput.schema");
const MapWhereInput_schema_1 = require("./objects/MapWhereInput.schema");
const MapWhereUniqueInput_schema_1 = require("./objects/MapWhereUniqueInput.schema");
const MapCountAggregateInput_schema_1 = require("./objects/MapCountAggregateInput.schema");
const MapMinAggregateInput_schema_1 = require("./objects/MapMinAggregateInput.schema");
const MapMaxAggregateInput_schema_1 = require("./objects/MapMaxAggregateInput.schema");
exports.MapAggregateSchema = zod_1.z.object({
    orderBy: zod_1.z
        .union([
        MapOrderByWithRelationInput_schema_1.MapOrderByWithRelationInputObjectSchema,
        MapOrderByWithRelationInput_schema_1.MapOrderByWithRelationInputObjectSchema.array(),
    ])
        .optional(),
    where: MapWhereInput_schema_1.MapWhereInputObjectSchema.optional(),
    cursor: MapWhereUniqueInput_schema_1.MapWhereUniqueInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    _count: zod_1.z
        .union([zod_1.z.literal(true), MapCountAggregateInput_schema_1.MapCountAggregateInputObjectSchema])
        .optional(),
    _min: MapMinAggregateInput_schema_1.MapMinAggregateInputObjectSchema.optional(),
    _max: MapMaxAggregateInput_schema_1.MapMaxAggregateInputObjectSchema.optional(),
});
//# sourceMappingURL=AggregateMap.schema.js.map