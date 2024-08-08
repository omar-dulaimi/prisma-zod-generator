"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostScalarFieldEnumSchema = void 0;
const zod_1 = require("zod");
exports.PostScalarFieldEnumSchema = zod_1.z.enum([
    'id',
    'createdAt',
    'updatedAt',
    'title',
    'content',
    'published',
    'viewCount',
    'authorId',
    'likes',
    'bytes',
]);
//# sourceMappingURL=PostScalarFieldEnum.schema.js.map