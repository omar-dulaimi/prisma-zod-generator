import { DMMF } from '@prisma/generator-helper';
import Transformer from '../transformer';
import { shouldGenerateIncludeForModel } from './include-helpers';
import {
  checkIsModelRelationField,
  checkModelHasEnabledManyModelRelation,
  getEnabledModels,
  getFilteredModelFields,
} from './model-helpers';

export function addMissingInputObjectTypesForSelect(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
  models: DMMF.Model[],
) {
  // In minimal mode, do not generate Select types at all
  const cfg = Transformer.getGeneratorConfig();
  if (cfg?.mode === 'minimal') {
    return;
  }
  // Filter models to only include enabled ones
  const enabledModels = getEnabledModels(models);

  // generate input object types necessary to support ModelSelect._count
  const modelCountOutputTypes = getFilteredModelCountOutputTypes(outputObjectTypes);
  const modelCountOutputTypeSelectInputObjectTypes =
    generateModelCountOutputTypeSelectInputObjectTypes(modelCountOutputTypes);
  const modelCountOutputTypeArgsInputObjectTypes =
    generateModelCountOutputTypeArgsInputObjectTypes(modelCountOutputTypes);

  const modelSelectInputObjectTypes = generateModelSelectInputObjectTypes(enabledModels);

  const generatedInputObjectTypes = [
    modelCountOutputTypeSelectInputObjectTypes,
    modelCountOutputTypeArgsInputObjectTypes,
    modelSelectInputObjectTypes,
  ].flat();

  for (const inputObjectType of generatedInputObjectTypes) {
    inputObjectTypes.push(inputObjectType);
  }
}

function getModelCountOutputTypes(outputObjectTypes: DMMF.OutputType[]) {
  return outputObjectTypes.filter(({ name }) => name.includes('CountOutputType'));
}

function getFilteredModelCountOutputTypes(outputObjectTypes: DMMF.OutputType[]) {
  const modelCountOutputTypes = getModelCountOutputTypes(outputObjectTypes);
  return modelCountOutputTypes.filter(({ name }) => {
    // Extract model name from count output type (e.g., "UserCountOutputType" -> "User")
    const modelName = name.replace('CountOutputType', '');
    return shouldGenerateIncludeForModel(modelName);
  });
}

function generateModelCountOutputTypeSelectInputObjectTypes(
  modelCountOutputTypes: DMMF.OutputType[],
) {
  const modelCountOutputTypeSelectInputObjectTypes: DMMF.InputType[] = [];
  for (const modelCountOutputType of modelCountOutputTypes) {
    const { name: modelCountOutputTypeName, fields: modelCountOutputTypeFields } =
      modelCountOutputType;
    const modelCountOutputTypeSelectInputObjectType: DMMF.InputType = {
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

function generateModelCountOutputTypeArgsInputObjectTypes(
  modelCountOutputTypes: DMMF.OutputType[],
) {
  const modelCountOutputTypeArgsInputObjectTypes: DMMF.InputType[] = [];
  for (const modelCountOutputType of modelCountOutputTypes) {
    const { name: modelCountOutputTypeName } = modelCountOutputType;
    const modelCountOutputTypeArgsInputObjectType: DMMF.InputType = {
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

function generateModelSelectInputObjectTypes(models: DMMF.Model[]) {
  const modelSelectInputObjectTypes: DMMF.InputType[] = [];
  for (const model of models) {
    const { name: modelName } = model;

    // Skip if model doesn't support select operations
    if (!shouldGenerateIncludeForModel(modelName)) {
      continue;
    }

    const fields: DMMF.SchemaArg[] = [];

    // Get filtered fields for the 'result' variant (what can be selected)
    const filteredFields = getFilteredModelFields(model, 'result');

    for (const modelField of filteredFields) {
      const { name: modelFieldName, isList, type } = modelField;

      const isRelationField = checkIsModelRelationField(modelField);

      const field: DMMF.SchemaArg = {
        name: modelFieldName,
        isRequired: false,
        isNullable: false,
        inputTypes: [{ isList: false, type: 'Boolean', location: 'scalar' }],
      };

      if (isRelationField) {
        // Only add relation selection if the related model is enabled
        if (Transformer.isModelEnabled(type)) {
          const schemaArgInputType: DMMF.SchemaArg['inputTypes'][0] = {
            isList: false,
            type: isList ? `${type}FindManyArgs` : `${type}Args`,
            location: 'inputObjectTypes',
            namespace: 'prisma',
          };
          (
            field.inputTypes as Array<{
              isList: boolean;
              type: string;
              location: string;
              namespace?: string;
            }>
          ).push(schemaArgInputType);
        }
      }

      fields.push(field);
    }

    const hasEnabledManyRelationToAnotherModel = checkModelHasEnabledManyModelRelation(model);

    const shouldAddCountField = hasEnabledManyRelationToAnotherModel;
    if (shouldAddCountField) {
      const _countField: DMMF.SchemaArg = {
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

    const modelSelectInputObjectType: DMMF.InputType = {
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
