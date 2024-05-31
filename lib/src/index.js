"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generator_helper_1 = require("@prisma/generator-helper");
const prisma_generator_1 = require("./prisma-generator");
(0, generator_helper_1.generatorHandler)({
    onManifest: () => ({
        defaultOutput: './generated',
        prettyName: 'Prisma Zod Generator',
        requiresGenerators: ['prisma-client-js'],
    }),
    onGenerate: prisma_generator_1.generate,
});
//# sourceMappingURL=index.js.map