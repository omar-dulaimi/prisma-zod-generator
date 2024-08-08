"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapDeleteManySchema = void 0;
const zod_1 = require("zod");
const MapWhereInput_schema_1 = require("./objects/MapWhereInput.schema");
exports.MapDeleteManySchema = zod_1.z.object({
    where: MapWhereInput_schema_1.MapWhereInputObjectSchema.optional(),
});
//# sourceMappingURL=DeleteManyMap.schema.js.map