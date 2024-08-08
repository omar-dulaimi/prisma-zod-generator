"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostUpdateWithWhereUniqueWithoutAuthorInputObjectSchema = void 0;
const zod_1 = require("zod");
const PostWhereUniqueInput_schema_1 = require("./PostWhereUniqueInput.schema");
const PostUpdateWithoutAuthorInput_schema_1 = require("./PostUpdateWithoutAuthorInput.schema");
const PostUncheckedUpdateWithoutAuthorInput_schema_1 = require("./PostUncheckedUpdateWithoutAuthorInput.schema");
// @ts-ignore
const Schema = zod_1.z
    .object({
    where: zod_1.z.lazy(() => PostWhereUniqueInput_schema_1.PostWhereUniqueInputObjectSchema),
    data: zod_1.z.union([
        zod_1.z.lazy(() => PostUpdateWithoutAuthorInput_schema_1.PostUpdateWithoutAuthorInputObjectSchema),
        zod_1.z.lazy(() => PostUncheckedUpdateWithoutAuthorInput_schema_1.PostUncheckedUpdateWithoutAuthorInputObjectSchema),
    ]),
})
    .strict();
exports.PostUpdateWithWhereUniqueWithoutAuthorInputObjectSchema = Schema;
//# sourceMappingURL=PostUpdateWithWhereUniqueWithoutAuthorInput.schema.js.map