import { DMMF } from '@prisma/generator-helper';
import Transformer from '../transformer';
import {
  checkModelHasEnabledManyModelRelation,
  checkModelHasEnabledModelRelation,
  getEnabledModels,
  getEnabledRelationFields,
  isOperationEnabledForModel,
} from './model-helpers';

export function addMissingInputObjectTypesForInclude(
  inputObjectTypes: DMMF.InputType[],
  models: DMMF.Model[],
  isGenerateSelect: boolean,
) {
  // In minimal mode, do not generate Include types at all
  const cfg = Transformer.getGeneratorConfig();
  if (cfg?.mode === 'minimal') {
    return;
  }
  // Filter models to only include enabled ones
  const enabledModels = getEnabledModels(models);

  // generate input object types necessary to support ModelInclude with relation support
  const generatedIncludeInputObjectTypes = generateModelIncludeInputObjectTypes(
    enabledModels,
    isGenerateSelect,
  );

  for (const includeInputObjectType of generatedIncludeInputObjectTypes) {
    inputObjectTypes.push(includeInputObjectType);
  }
}
function generateModelIncludeInputObjectTypes(models: DMMF.Model[], isGenerateSelect: boolean) {
  const modelIncludeInputObjectTypes: DMMF.InputType[] = [];
  for (const model of models) {
    const { name: modelName } = model;

    // Skip if model doesn't support include/select operations
    if (!shouldGenerateIncludeForModel(modelName)) {
      continue;
    }

    const fields: DMMF.SchemaArg[] = [];

    // Only include enabled relation fields
    const enabledRelationFields = getEnabledRelationFields(model);

    for (const modelField of enabledRelationFields) {
      const { name: modelFieldName, isList, type } = modelField;

      const field: DMMF.SchemaArg = {
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

    /**
     * include is not generated for models that do not have enabled relations with other models
     * -> continue onto the next model
     */
    const hasEnabledRelationToAnotherModel = checkModelHasEnabledModelRelation(model);
    if (!hasEnabledRelationToAnotherModel) {
      continue;
    }

    const hasEnabledManyRelationToAnotherModel = checkModelHasEnabledManyModelRelation(model);

    const shouldAddCountField = hasEnabledManyRelationToAnotherModel;
    if (shouldAddCountField) {
      const inputTypes: DMMF.SchemaArg['inputTypes'] = [
        { isList: false, type: 'Boolean', location: 'scalar' },
      ];
      if (isGenerateSelect) {
        (
          inputTypes as Array<{
            isList: boolean;
            type: string;
            location: string;
            namespace?: string;
          }>
        ).push({
          isList: false,
          type: `${modelName}CountOutputTypeArgs`,
          location: 'inputObjectTypes',
          namespace: 'prisma',
        });
      }
      const _countField: DMMF.SchemaArg = {
        name: '_count',
        isRequired: false,
        isNullable: false,
        inputTypes,
      };
      fields.push(_countField);
    }

    const modelIncludeInputObjectType: DMMF.InputType = {
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

/**
 * Check if include schema should be generated for a model
 */
export function shouldGenerateIncludeForModel(modelName: string): boolean {
  return (
    Transformer.isModelEnabled(modelName) &&
    (isOperationEnabledForModel(modelName, 'findUnique') ||
      isOperationEnabledForModel(modelName, 'findFirst') ||
      isOperationEnabledForModel(modelName, 'findMany'))
  );
}
