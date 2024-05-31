"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMissingInputObjectTypesForInclude = void 0;
const model_helpers_1 = require("./model-helpers");
function addMissingInputObjectTypesForInclude(inputObjectTypes, models, isGenerateSelect) {
    // generate input object types necessary to support ModelInclude with relation support
    const generatedIncludeInputObjectTypes = generateModelIncludeInputObjectTypes(models, isGenerateSelect);
    for (const includeInputObjectType of generatedIncludeInputObjectTypes) {
        inputObjectTypes.push(includeInputObjectType);
    }
}
exports.addMissingInputObjectTypesForInclude = addMissingInputObjectTypesForInclude;
function generateModelIncludeInputObjectTypes(models, isGenerateSelect) {
    const modelIncludeInputObjectTypes = [];
    for (const model of models) {
        const { name: modelName, fields: modelFields } = model;
        const fields = [];
        for (const modelField of modelFields) {
            const { name: modelFieldName, isList, type } = modelField;
            const isRelationField = (0, model_helpers_1.checkIsModelRelationField)(modelField);
            if (isRelationField) {
                const field = {
                    name: modelFieldName,
                    isRequired: false,
                    isNullable: false,
                    inputTypes: [
                        { isList: false, type: 'Boolean', location: 'scalar' },
                        {
                            isList: false,
                            type: isList ? `${type}FindManyArgs` : `${type}Args`,
                            location: 'inputObjectTypes',
                            namespace: 'prisma',
                        },
                    ],
                };
                fields.push(field);
            }
        }
        /**
         * include is not generated for models that do not have a relation with any other models
         * -> continue onto the next model
         */
        const hasRelationToAnotherModel = (0, model_helpers_1.checkModelHasModelRelation)(model);
        if (!hasRelationToAnotherModel) {
            continue;
        }
        const hasManyRelationToAnotherModel = (0, model_helpers_1.checkModelHasManyModelRelation)(model);
        const shouldAddCountField = hasManyRelationToAnotherModel;
        if (shouldAddCountField) {
            const inputTypes = [
                { isList: false, type: 'Boolean', location: 'scalar' },
            ];
            if (isGenerateSelect) {
                inputTypes.push({
                    isList: false,
                    type: `${modelName}CountOutputTypeArgs`,
                    location: 'inputObjectTypes',
                    namespace: 'prisma',
                });
            }
            const _countField = {
                name: '_count',
                isRequired: false,
                isNullable: false,
                inputTypes,
            };
            fields.push(_countField);
        }
        const modelIncludeInputObjectType = {
            name: `${modelName}Include`,
            constraints: {
                maxNumFields: null,
                minNumFields: null,
            },
            fields,
        };
        modelIncludeInputObjectTypes.push(modelIncludeInputObjectType);
    }
    return modelIncludeInputObjectTypes;
}
//# sourceMappingURL=include-helpers.js.map