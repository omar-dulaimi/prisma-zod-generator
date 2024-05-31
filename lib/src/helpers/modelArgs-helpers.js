"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMissingInputObjectTypesForModelArgs = void 0;
const model_helpers_1 = require("./model-helpers");
function addMissingInputObjectTypesForModelArgs(inputObjectTypes, models, isGenerateSelect, isGenerateInclude) {
    const modelArgsInputObjectTypes = generateModelArgsInputObjectTypes(models, isGenerateSelect, isGenerateInclude);
    for (const modelArgsInputObjectType of modelArgsInputObjectTypes) {
        inputObjectTypes.push(modelArgsInputObjectType);
    }
}
exports.addMissingInputObjectTypesForModelArgs = addMissingInputObjectTypesForModelArgs;
function generateModelArgsInputObjectTypes(models, isGenerateSelect, isGenerateInclude) {
    const modelArgsInputObjectTypes = [];
    for (const model of models) {
        const { name: modelName } = model;
        const fields = [];
        if (isGenerateSelect) {
            const selectField = {
                name: 'select',
                isRequired: false,
                isNullable: false,
                inputTypes: [
                    {
                        isList: false,
                        type: `${modelName}Select`,
                        location: 'inputObjectTypes',
                        namespace: 'prisma',
                    },
                ],
            };
            fields.push(selectField);
        }
        const hasRelationToAnotherModel = (0, model_helpers_1.checkModelHasModelRelation)(model);
        if (isGenerateInclude && hasRelationToAnotherModel) {
            const includeField = {
                name: 'include',
                isRequired: false,
                isNullable: false,
                inputTypes: [
                    {
                        isList: false,
                        type: `${modelName}Include`,
                        location: 'inputObjectTypes',
                        namespace: 'prisma',
                    },
                ],
            };
            fields.push(includeField);
        }
        const modelArgsInputObjectType = {
            name: `${modelName}Args`,
            constraints: {
                maxNumFields: null,
                minNumFields: null,
            },
            fields,
        };
        modelArgsInputObjectTypes.push(modelArgsInputObjectType);
    }
    return modelArgsInputObjectTypes;
}
//# sourceMappingURL=modelArgs-helpers.js.map