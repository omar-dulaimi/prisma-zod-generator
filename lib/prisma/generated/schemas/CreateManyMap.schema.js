"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapCreateManySchema = void 0;
const zod_1 = require("zod");
const MapCreateManyInput_schema_1 = require("./objects/MapCreateManyInput.schema");
exports.MapCreateManySchema = zod_1.z.object({
    data: zod_1.z.union([
        MapCreateManyInput_schema_1.MapCreateManyInputObjectSchema,
        zod_1.z.array(MapCreateManyInput_schema_1.MapCreateManyInputObjectSchema),
    ]),
    skipDuplicates: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=CreateManyMap.schema.js.map