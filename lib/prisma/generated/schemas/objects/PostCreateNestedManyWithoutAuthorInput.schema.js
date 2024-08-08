"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCreateNestedManyWithoutAuthorInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostCreateWithoutAuthorInput_schema_1 = require("./PostCreateWithoutAuthorInput.schema");
const PostUncheckedCreateWithoutAuthorInput_schema_1 = require("./PostUncheckedCreateWithoutAuthorInput.schema");
const PostCreateOrConnectWithoutAuthorInput_schema_1 = require("./PostCreateOrConnectWithoutAuthorInput.schema");
const PostCreateManyAuthorInputEnvelope_schema_1 = require("./PostCreateManyAuthorInputEnvelope.schema");
const PostWhereUniqueInput_schema_1 = require("./PostWhereUniqueInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    create: zod_1.z
        .union([
        zod_1.z.lazy(() => PostCreateWithoutAuthorInput_schema_1.PostCreateWithoutAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostCreateWithoutAuthorInput_schema_1.PostCreateWithoutAuthorInputObjectSchema).array(),
        zod_1.z.lazy(() => PostUncheckedCreateWithoutAuthorInput_schema_1.PostUncheckedCreateWithoutAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostUncheckedCreateWithoutAuthorInput_schema_1.PostUncheckedCreateWithoutAuthorInputObjectSchema).array(),
    ])
        .optional(),
    connectOrCreate: zod_1.z
        .union([
        zod_1.z.lazy(() => PostCreateOrConnectWithoutAuthorInput_schema_1.PostCreateOrConnectWithoutAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostCreateOrConnectWithoutAuthorInput_schema_1.PostCreateOrConnectWithoutAuthorInputObjectSchema).array(),
    ])
        .optional(),
    createMany: zod_1.z
        .lazy(() => PostCreateManyAuthorInputEnvelope_schema_1.PostCreateManyAuthorInputEnvelopeObjectSchema)
        .optional(),
    connect: zod_1.z
        .union([
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema).array(),
    ])
        .optional(),
})
    .strict();
exports.PostCreateNestedManyWithoutAuthorInputObjectSchema = Schema;
//# sourceMappingURL=PostCreateNestedManyWithoutAuthorInput.schema.js.map