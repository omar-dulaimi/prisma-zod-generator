"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapFindManySchema = void 0;
const zod_1 = require("zod");
const MapSelect_schema_1 = require("./objects/MapSelect.schema");
const MapOrderByWithRelationInput_schema_1 = require("./objects/MapOrderByWithRelationInput.schema");
const MapWhereInput_schema_1 = require("./objects/MapWhereInput.schema");
const MapWhereUniqueInput_schema_1 = require("./objects/MapWhereUniqueInput.schema");
const MapScalarFieldEnum_schema_1 = require("./enums/MapScalarFieldEnum.schema");
exports.MapFindManySchema = zod_1.z.object({
    select: zod_1.z.lazy(() => MapSelect_schema_1.MapSelectObjectSchema.optional()),
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
    distinct: zod_1.z.array(MapScalarFieldEnum_schema_1.MapScalarFieldEnumSchema).optional(),
});
//# sourceMappingURL=FindManyMap.schema.js.map