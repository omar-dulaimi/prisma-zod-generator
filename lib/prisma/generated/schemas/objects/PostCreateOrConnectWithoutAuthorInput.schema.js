"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCreateOrConnectWithoutAuthorInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostWhereUniqueInput_schema_1 = require("./PostWhereUniqueInput.schema");
const PostCreateWithoutAuthorInput_schema_1 = require("./PostCreateWithoutAuthorInput.schema");
const PostUncheckedCreateWithoutAuthorInput_schema_1 = require("./PostUncheckedCreateWithoutAuthorInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
    create: zod_1.z.union([
        zod_1.z.lazy(() => PostCreateWithoutAuthorInput_schema_1.PostCreateWithoutAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostUncheckedCreateWithoutAuthorInput_schema_1.PostUncheckedCreateWithoutAuthorInputObjectSchema),
    ]),
})
    .strict();
exports.PostCreateOrConnectWithoutAuthorInputObjectSchema = Schema;
//# sourceMappingURL=PostCreateOrConnectWithoutAuthorInput.schema.js.map