"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAddMissingInputObjectTypeOptions = exports.addMissingInputObjectTypes = void 0;
const transformer_1 = __importDefault(require("../transformer"));
const aggregate_helpers_1 = require("./aggregate-helpers");
const include_helpers_1 = require("./include-helpers");
const modelArgs_helpers_1 = require("./modelArgs-helpers");
const mongodb_helpers_1 = require("./mongodb-helpers");
const select_helpers_1 = require("./select-helpers");
const whereUniqueInput_helpers_1 = require("./whereUniqueInput-helpers");
function addMissingInputObjectTypes(inputObjectTypes, outputObjectTypes, models, modelOperations, dataSourceProvider, options) {
    // TODO: remove once Prisma fix this issue: https://github.com/prisma/prisma/issues/14900
    if (dataSourceProvider === 'mongodb') {
        (0, mongodb_helpers_1.addMissingInputObjectTypesForMongoDbRawOpsAndQueries)(modelOperations, outputObjectTypes, inputObjectTypes);
    }
    (0, aggregate_helpers_1.addMissingInputObjectTypesForAggregate)(inputObjectTypes, outputObjectTypes);
    if (options.isGenerateSelect) {
        (0, select_helpers_1.addMissingInputObjectTypesForSelect)(inputObjectTypes, outputObjectTypes, models);
        transformer_1.default.setIsGenerateSelect(true);
    }
    if (options.isGenerateSelect || options.isGenerateInclude) {
        (0, modelArgs_helpers_1.addMissingInputObjectTypesForModelArgs)(inputObjectTypes, models, options.isGenerateSelect, options.isGenerateInclude);
    }
    if (options.isGenerateInclude) {
        (0, include_helpers_1.addMissingInputObjectTypesForInclude)(inputObjectTypes, models, options.isGenerateSelect);
        transformer_1.default.setIsGenerateInclude(true);
    }
    (0, whereUniqueInput_helpers_1.changeOptionalToRequiredFields)(inputObjectTypes);
}
exports.addMissingInputObjectTypes = addMissingInputObjectTypes;
function resolveAddMissingInputObjectTypeOptions(generatorConfigOptions) {
    return {
        isGenerateSelect: generatorConfigOptions.isGenerateSelect === 'true',
        isGenerateInclude: generatorConfigOptions.isGenerateInclude === 'true',
    };
}
exports.resolveAddMissingInputObjectTypeOptions = resolveAddMissingInputObjectTypeOptions;
//# sourceMappingURL=helpers.js.map