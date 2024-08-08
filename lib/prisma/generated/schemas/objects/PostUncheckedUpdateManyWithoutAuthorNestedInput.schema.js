"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUncheckedUpdateManyWithoutAuthorNestedInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostCreateWithoutAuthorInput_schema_1 = require("./PostCreateWithoutAuthorInput.schema");
const PostUncheckedCreateWithoutAuthorInput_schema_1 = require("./PostUncheckedCreateWithoutAuthorInput.schema");
const PostCreateOrConnectWithoutAuthorInput_schema_1 = require("./PostCreateOrConnectWithoutAuthorInput.schema");
const PostUpsertWithWhereUniqueWithoutAuthorInput_schema_1 = require("./PostUpsertWithWhereUniqueWithoutAuthorInput.schema");
const PostCreateManyAuthorInputEnvelope_schema_1 = require("./PostCreateManyAuthorInputEnvelope.schema");
const PostWhereUniqueInput_schema_1 = require("./PostWhereUniqueInput.schema");
const PostUpdateWithWhereUniqueWithoutAuthorInput_schema_1 = require("./PostUpdateWithWhereUniqueWithoutAuthorInput.schema");
const PostUpdateManyWithWhereWithoutAuthorInput_schema_1 = require("./PostUpdateManyWithWhereWithoutAuthorInput.schema");
const PostScalarWhereInput_schema_1 = require("./PostScalarWhereInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    create: zod_1.z
        .union([
        zod_1.z.lazy(() => PostCreateWithoutAuthorInput_schema_1.PostCreateWithoutAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostCreateWithoutAuthorInput_schema_1.PostCreateWithoutAuthorInputObjectSchema).array(),
        zod_1.z.lazy(() => PostUncheckedCreateWithoutAuthorInput_schema_1.PostUncheckedCreateWithoutAuthorInputObjectSchema),
        zod_1.z
            .lazy(() => PostUncheckedCreateWithoutAuthorInput_schema_1.PostUncheckedCreateWithoutAuthorInputObjectSchema)
            .array(),
    ])
        .optional(),
    connectOrCreate: zod_1.z
        .union([
        zod_1.z.lazy(() => PostCreateOrConnectWithoutAuthorInput_schema_1.PostCreateOrConnectWithoutAuthorInputObjectSchema),
        zod_1.z
            .lazy(() => PostCreateOrConnectWithoutAuthorInput_schema_1.PostCreateOrConnectWithoutAuthorInputObjectSchema)
            .array(),
    ])
        .optional(),
    upsert: zod_1.z
        .union([
        zod_1.z.lazy(() => PostUpsertWithWhereUniqueWithoutAuthorInput_schema_1.PostUpsertWithWhereUniqueWithoutAuthorInputObjectSchema),
        zod_1.z
            .lazy(() => PostUpsertWithWhereUniqueWithoutAuthorInput_schema_1.PostUpsertWithWhereUniqueWithoutAuthorInputObjectSchema)
            .array(),
    ])
        .optional(),
    createMany: zod_1.z
        .lazy(() => PostCreateManyAuthorInputEnvelope_schema_1.PostCreateManyAuthorInputEnvelopeObjectSchema)
        .optional(),
    set: zod_1.z
        .union([
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema).array(),
    ])
        .optional(),
    disconnect: zod_1.z
        .union([
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema).array(),
    ])
        .optional(),
    delete: zod_1.z
        .union([
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema).array(),
    ])
        .optional(),
    connect: zod_1.z
        .union([
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
        zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema).array(),
    ])
        .optional(),
    update: zod_1.z
        .union([
        zod_1.z.lazy(() => PostUpdateWithWhereUniqueWithoutAuthorInput_schema_1.PostUpdateWithWhereUniqueWithoutAuthorInputObjectSchema),
        zod_1.z
            .lazy(() => PostUpdateWithWhereUniqueWithoutAuthorInput_schema_1.PostUpdateWithWhereUniqueWithoutAuthorInputObjectSchema)
            .array(),
    ])
        .optional(),
    updateMany: zod_1.z
        .union([
        zod_1.z.lazy(() => PostUpdateManyWithWhereWithoutAuthorInput_schema_1.PostUpdateManyWithWhereWithoutAuthorInputObjectSchema),
        zod_1.z
            .lazy(() => PostUpdateManyWithWhereWithoutAuthorInput_schema_1.PostUpdateManyWithWhereWithoutAuthorInputObjectSchema)
            .array(),
    ])
        .optional(),
    deleteMany: zod_1.z
        .union([
        zod_1.z.lazy(() => PostScalarWhereInput_schema_1.PostScalarWhereInputObjectSchema),
        zod_1.z.lazy(() => PostScalarWhereInput_schema_1.PostScalarWhereInputObjectSchema).array(),
    ])
        .optional(),
})
    .strict();
exports.PostUncheckedUpdateManyWithoutAuthorNestedInputObjectSchema = Schema;
//# sourceMappingURL=PostUncheckedUpdateManyWithoutAuthorNestedInput.schema.js.map