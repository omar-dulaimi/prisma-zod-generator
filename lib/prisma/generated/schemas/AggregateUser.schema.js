"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAggregateSchema = void 0;
const zod_1 = require("zod");
const UserOrderByWithRelationInput_schema_1 = require("./objects/UserOrderByWithRelationInput.schema");
const UserWhereInput_schema_1 = require("./objects/UserWhereInput.schema");
const UserWhereUniqueInput_schema_1 = require("./objects/UserWhereUniqueInput.schema");
const UserCountAggregateInput_schema_1 = require("./objects/UserCountAggregateInput.schema");
const UserMinAggregateInput_schema_1 = require("./objects/UserMinAggregateInput.schema");
const UserMaxAggregateInput_schema_1 = require("./objects/UserMaxAggregateInput.schema");
const UserAvgAggregateInput_schema_1 = require("./objects/UserAvgAggregateInput.schema");
const UserSumAggregateInput_schema_1 = require("./objects/UserSumAggregateInput.schema");
exports.UserAggregateSchema = zod_1.z.object({
    orderBy: zod_1.z
        .union([
        UserOrderByWithRelationInput_schema_1.UserOrderByWithRelationInputObjectSchema,
        UserOrderByWithRelationInput_schema_1.UserOrderByWithRelationInputObjectSchema.array(),
    ])
        .optional(),
    where: UserWhereInput_schema_1.UserWhereInputObjectSchema.optional(),
    cursor: UserWhereUniqueInput_schema_1.UserWhereUniqueInputObjectSchema.optional(),
    take: zod_1.z.number().optional(),
    skip: zod_1.z.number().optional(),
    _count: zod_1.z
        .union([zod_1.z.literal(true), UserCountAggregateInput_schema_1.UserCountAggregateInputObjectSchema])
        .optional(),
    _min: UserMinAggregateInput_schema_1.UserMinAggregateInputObjectSchema.optional(),
    _max: UserMaxAggregateInput_schema_1.UserMaxAggregateInputObjectSchema.optional(),
    _avg: UserAvgAggregateInput_schema_1.UserAvgAggregateInputObjectSchema.optional(),
    _sum: UserSumAggregateInput_schema_1.UserSumAggregateInputObjectSchema.optional(),
});
//# sourceMappingURL=AggregateUser.schema.js.map