"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMissingInputObjectTypesForSelect = void 0;
const model_helpers_1 = require("./model-helpers");
function addMissingInputObjectTypesForSelect(inputObjectTypes, outputObjectTypes, models) {
    // generate input object types necessary to support ModelSelect._count
    const modelCountOutputTypes = getModelCountOutputTypes(outputObjectTypes);
    const modelCountOutputTypeSelectInputObjectTypes = generateModelCountOutputTypeSelectInputObjectTypes(modelCountOutputTypes);
    const modelCountOutputTypeArgsInputObjectTypes = generateModelCountOutputTypeArgsInputObjectTypes(modelCountOutputTypes);
    const modelSelectInputObjectTypes = generateModelSelectInputObjectTypes(models);
    const generatedInputObjectTypes = [
        modelCountOutputTypeSelectInputObjectTypes,
        modelCountOutputTypeArgsInputObjectTypes,
        modelSelectInputObjectTypes,
    ].flat();
    for (const inputObjectType of generatedInputObjectTypes) {
        inputObjectTypes.push(inputObjectType);
    }
}
exports.addMissingInputObjectTypesForSelect = addMissingInputObjectTypesForSelect;
function getModelCountOutputTypes(outputObjectTypes) {
    return outputObjectTypes.filter(({ name }) => name.includes('CountOutputType'));
}
function generateModelCountOutputTypeSelectInputObjectTypes(modelCountOutputTypes) {
    const modelCountOutputTypeSelectInputObjectTypes = [];
    for (const modelCountOutputType of modelCountOutputTypes) {
        const { name: modelCountOutputTypeName, fields: modelCountOutputTypeFields, } = modelCountOutputType;
        const modelCountOutputTypeSelectInputObjectType = {
            name: `${modelCountOutputTypeName}Select`,
            constraints: {
                maxNumFields: null,
                minNumFields: null,
            },
            fields: modelCountOutputTypeFields.map(({ name }) => ({
                name,
                isRequired: false,
                isNullable: false,
                inputTypes: [
                    {
                        isList: false,
                        type: `Boolean`,
                        location: 'scalar',
                    },
                ],
            })),
        };
        modelCountOutputTypeSelectInputObjectTypes.push(modelCountOutputTypeSelectInputObjectType);
    }
    return modelCountOutputTypeSelectInputObjectTypes;
}
function generateModelCountOutputTypeArgsInputObjectTypes(modelCountOutputTypes) {
    const modelCountOutputTypeArgsInputObjectTypes = [];
    for (const modelCountOutputType of modelCountOutputTypes) {
        const { name: modelCountOutputTypeName } = modelCountOutputType;
        const modelCountOutputTypeArgsInputObjectType = {
            name: `${modelCountOutputTypeName}Args`,
            constraints: {
                maxNumFields: null,
                minNumFields: null,
            },
            fields: [
                {
                    name: 'select',
                    isRequired: false,
                    isNullable: false,
                    inputTypes: [
                        {
                            isList: false,
                            type: `${modelCountOutputTypeName}Select`,
                            location: 'inputObjectTypes',
                            namespace: 'prisma',
                        },
                    ],
                },
            ],
        };
        modelCountOutputTypeArgsInputObjectTypes.push(modelCountOutputTypeArgsInputObjectType);
    }
    return modelCountOutputTypeArgsInputObjectTypes;
}
function generateModelSelectInputObjectTypes(models) {
    const modelSelectInputObjectTypes = [];
    for (const model of models) {
        const { name: modelName, fields: modelFields } = model;
        const fields = [];
        for (const modelField of modelFields) {
            const { name: modelFieldName, isList, type } = modelField;
            const isRelationField = (0, model_helpers_1.checkIsModelRelationField)(modelField);
            const field = {
                name: modelFieldName,
                isRequired: false,
                isNullable: false,
                inputTypes: [{ isList: false, type: 'Boolean', location: 'scalar' }],
            };
            if (isRelationField) {
                let schemaArgInputType = {
                    isList: false,
                    type: isList ? `${type}FindManyArgs` : `${type}Args`,
                    location: 'inputObjectTypes',
                    namespace: 'prisma',
                };
                field.inputTypes.push(schemaArgInputType);
            }
            fields.push(field);
        }
        const hasManyRelationToAnotherModel = (0, model_helpers_1.checkModelHasManyModelRelation)(model);
        const shouldAddCountField = hasManyRelationToAnotherModel;
        if (shouldAddCountField) {
            const _countField = {
                name: '_count',
                isRequired: false,
                isNullable: false,
                inputTypes: [
                    { isList: false, type: 'Boolean', location: 'scalar' },
                    {
                        isList: false,
                        type: `${modelName}CountOutputTypeArgs`,
                        location: 'inputObjectTypes',
                        namespace: 'prisma',
                    },
                ],
            };
            fields.push(_countField);
        }
        const modelSelectInputObjectType = {
            name: `${modelName}Select`,
            constraints: {
                maxNumFields: null,
                minNumFields: null,
            },
            fields,
        };
        modelSelectInputObjectTypes.push(modelSelectInputObjectType);
    }
    return modelSelectInputObjectTypes;
}
//# sourceMappingURL=select-helpers.js.map