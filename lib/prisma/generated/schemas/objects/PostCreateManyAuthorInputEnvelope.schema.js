"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCreateManyAuthorInputEnvelopeObjectSchema = void 0;
const zod_1 = require("zod");
const PostCreateManyAuthorInput_schema_1 = require("./PostCreateManyAuthorInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    data: zod_1.z.union([
        zod_1.z.lazy(() => PostCreateManyAuthorInput_schema_1.PostCreateManyAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostCreateManyAuthorInput_schema_1.PostCreateManyAuthorInputObjectSchema).array(),
    ]),
})
    .strict();
exports.PostCreateManyAuthorInputEnvelopeObjectSchema = Schema;
//# sourceMappingURL=PostCreateManyAuthorInputEnvelope.schema.js.map