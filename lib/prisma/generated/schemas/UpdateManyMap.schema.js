"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapUpdateManySchema = void 0;
const zod_1 = require("zod");
const MapUpdateManyMutationInput_schema_1 = require("./objects/MapUpdateManyMutationInput.schema");
const MapWhereInput_schema_1 = require("./objects/MapWhereInput.schema");
exports.MapUpdateManySchema = zod_1.z.object({
    data: MapUpdateManyMutationInput_schema_1.MapUpdateManyMutationInputObjectSchema,
    where: MapWhereInput_schema_1.MapWhereInputObjectSchema.optional(),
});
//# sourceMappingURL=UpdateManyMap.schema.js.map