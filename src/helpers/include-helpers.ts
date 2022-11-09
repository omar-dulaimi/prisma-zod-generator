import { DMMF } from '@prisma/generator-helper';

export function addMissingInputObjectTypesForInclude(
  inputObjectTypes: DMMF.InputType[],
  models: DMMF.Model[],
  isGenerateSelect: boolean,
) {
  // generate input object types necessary to support ModelInclude with relation support
  const modelIncludeInputObjectTypes = generateModelIncludeInputObjectTypes(
    models,
    isGenerateSelect,
  );

  const generatedIncludeInputObjectTypes = [
    modelIncludeInputObjectTypes,
  ].flat();

  for (const includeInputObjectType of generatedIncludeInputObjectTypes) {
    inputObjectTypes.push(includeInputObjectType);
  }
}
function generateModelIncludeInputObjectTypes(
  models: DMMF.Model[],
  isGenerateSelect: boolean,
) {
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
      const inputTypes: DMMF.SchemaArgInputType[] = [
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
