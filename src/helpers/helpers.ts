import { DMMF } from '@prisma/generator-helper';

export function addMissingInputObjectTypes(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
  models: DMMF.Model[],
) {
  addMissingInputObjectTypesForSelect(
    inputObjectTypes,
    outputObjectTypes,
    models,
  );
}

function addMissingInputObjectTypesForSelect(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
  models: DMMF.Model[],
) {
  // generate input object types necessary to support ModelSelect._count
  const modelCountOutputTypes = getModelCountOutputTypes(outputObjectTypes);
  const modelCountOutputTypeSelectInputObjectTypes =
    generateModelCountOutputTypeSelectInputObjectTypes(modelCountOutputTypes);
  const modelCountOutputTypeArgsInputObjectTypes =
    generateModelCountOutputTypeArgsInputObjectTypes(modelCountOutputTypes);

  // generate input object types necessary to support ModelSelect with relation support
  const modelArgsInputObjectTypes = generateModelArgsInputObjectTypes(models);
  const modelSelectInputObjectTypes =
    generateModelSelectInputObjectTypes(models);

  const generatedInputObjectTypes = [
    modelCountOutputTypeSelectInputObjectTypes,
    modelCountOutputTypeArgsInputObjectTypes,
    modelArgsInputObjectTypes,
    modelSelectInputObjectTypes,
  ].flat();

  for (const inputObjectType of generatedInputObjectTypes) {
    inputObjectTypes.push(inputObjectType);
  }
}

function getModelCountOutputTypes(outputObjectTypes: DMMF.OutputType[]) {
  return outputObjectTypes.filter(({ name }) =>
    name.includes('CountOutputType'),
  );
}

function generateModelCountOutputTypeSelectInputObjectTypes(
  modelCountOutputTypes: DMMF.OutputType[],
) {
  const modelCountOutputTypeSelectInputObjectTypes: DMMF.InputType[] = [];
  for (const modelCountOutputType of modelCountOutputTypes) {
    const {
      name: modelCountOutputTypeName,
      fields: modelCountOutputTypeFields,
    } = modelCountOutputType;
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
    modelCountOutputTypeSelectInputObjectTypes.push(
      modelCountOutputTypeSelectInputObjectType,
    );
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
    modelCountOutputTypeArgsInputObjectTypes.push(
      modelCountOutputTypeArgsInputObjectType,
    );
  }
  return modelCountOutputTypeArgsInputObjectTypes;
}

function generateModelArgsInputObjectTypes(models: DMMF.Model[]) {
  const modelArgsInputObjectTypes: DMMF.InputType[] = [];
  for (const model of models) {
    const { name: modelName } = model;
    const fields: DMMF.SchemaArg[] = [];

    const selectField: DMMF.SchemaArg = {
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

    /** @todo add include field in a future pull request */

    const modelArgsInputObjectType: DMMF.InputType = {
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

function generateModelSelectInputObjectTypes(models: DMMF.Model[]) {
  const modelSelectInputObjectTypes: DMMF.InputType[] = [];
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

      const field: DMMF.SchemaArg = {
        name: modelFieldName,
        isRequired: false,
        isNullable: false,
        inputTypes: [{ isList: false, type: 'Boolean', location: 'scalar' }],
      };

      if (isRelationField) {
        let schemaArgInputType: DMMF.SchemaArgInputType = {
          isList: false,
          type: isList ? `${type}FindManyArgs` : `${type}Args`,
          location: 'inputObjectTypes',
          namespace: 'prisma',
        };
        field.inputTypes.push(schemaArgInputType);
      }

      fields.push(field);
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
