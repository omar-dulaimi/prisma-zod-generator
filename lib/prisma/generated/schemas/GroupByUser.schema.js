"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserGroupBySchema = void 0;
const zod_1 = require("zod");
const UserWhereInput_schema_1 = require("./objects/UserWhereInput.schema");
const UserOrderByWithAggregationInput_schema_1 = require("./objects/UserOrderByWithAggregationInput.schema");
const UserScalarWhereWithAggregatesInput_schema_1 = require("./objects/UserScalarWhereWithAggregatesInput.schema");
const UserScalarFieldEnum_schema_1 = require("./enums/UserScalarFieldEnum.schema");
exports.UserGroupBySchema = zod_1.z.object({
    where: UserWhereInput_schema_1.UserWhereInputObjectSchema.optional(),
    orderBy: zod_1.z
        .union([
        UserOrderByWithAggregationInput_schema_1.UserOrderByWithAggregationInputObjectSchema,
        UserOrderByWithAggregationInput_schema_1.UserOrderByWithAggregationInputObjectSchema.array(),
    ])
        .optional(),
    having: UserScalarWhereWithAggregatesInput_schema_1.UserScalarWhereWithAggregatesInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    by: zod_1.z.array(UserScalarFieldEnum_schema_1.UserScalarFieldEnumSchema),
});
//# sourceMappingURL=GroupByUser.schema.js.map