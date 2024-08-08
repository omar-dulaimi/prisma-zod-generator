"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostOrderByWithRelationInputObjectSchema = void 0;
const zod_1 = require("zod");
const SortOrder_schema_1 = require("../enums/SortOrder.schema");
const SortOrderInput_schema_1 = require("./SortOrderInput.schema");
const UserOrderByWithRelationInput_schema_1 = require("./UserOrderByWithRelationInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    id: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    createdAt: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    updatedAt: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    title: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    content: zod_1.z
        .union([
        zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema),
        zod_1.z.lazy(() => SortOrderInput_schema_1.SortOrderInputObjectSchema),
    ])
        .optional(),
    published: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    viewCount: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    authorId: zod_1.z
        .union([
        zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema),
        zod_1.z.lazy(() => SortOrderInput_schema_1.SortOrderInputObjectSchema),
    ])
        .optional(),
    likes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    bytes: zod_1.z.lazy(() => SortOrder_schema_1.SortOrderSchema).optional(),
    author: zod_1.z.lazy(() => UserOrderByWithRelationInput_schema_1.UserOrderByWithRelationInputObjectSchema).optional(),
})
    .strict();
exports.PostOrderByWithRelationInputObjectSchema = Schema;
//# sourceMappingURL=PostOrderByWithRelationInput.schema.js.map