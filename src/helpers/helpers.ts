import { DMMF, ConnectorType, Dictionary } from '@prisma/generator-helper';
import Transformer from '../transformer';
import { addMissingInputObjectTypesForMongoDbRawOpsAndQueries } from './mongodb-helpers';
import { addMissingInputObjectTypesForAggregate } from './aggregate-helpers';
import { addMissingInputObjectTypesForSelect } from './select-helpers';

interface AddMissingInputObjectTypeOptions {
  isGenerateSelect: boolean;
}

export function addMissingInputObjectTypes(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
  models: DMMF.Model[],
  modelOperations: DMMF.ModelMapping[],
  dataSourceProvider: ConnectorType,
  options: AddMissingInputObjectTypeOptions,
) {
  // TODO: remove once Prisma fix this issue: https://github.com/prisma/prisma/issues/14900
  if (dataSourceProvider === 'mongodb') {
    addMissingInputObjectTypesForMongoDbRawOpsAndQueries(
      modelOperations,
      outputObjectTypes,
      inputObjectTypes,
    );
  }
  addMissingInputObjectTypesForAggregate(inputObjectTypes, outputObjectTypes);
  if (options.isGenerateSelect) {
    addMissingInputObjectTypesForSelect(
      inputObjectTypes,
      outputObjectTypes,
      models,
    );
    Transformer.setIsGenerateSelect(true);
  }
}

export function resolveAddMissingInputObjectTypeOptions(
  generatorConfigOptions: Dictionary<string>,
): AddMissingInputObjectTypeOptions {
  return {
    isGenerateSelect: generatorConfigOptions.isGenerateSelect === 'true',
  };
}

function generateModelIncludeInputObjectTypes(models: DMMF.Model[]) {
  const modelIncludeInputObjectTypes: DMMF.InputType[] = [];
  for (const model of models) {
    const { name: modelName, fields: modelFields } = model;
    const fields: DMMF.SchemaArg[] = [];

    let hasManyRelation = false;

    for (const modelField of modelFields) {
      const {
        name: modelFieldName,
        kind,
        relationName,
        isList,
        type,
      } = modelField;

      const isRelationField = kind === 'object' && !!relationName;
      if (isRelationField && isList) {
        hasManyRelation = true;
      }

      if (isRelationField) {
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
    }

    const shouldAddCountField = hasManyRelation;
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
