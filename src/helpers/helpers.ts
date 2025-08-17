import { ConnectorType, DMMF } from '@prisma/generator-helper';
import Transformer from '../transformer';
import { addMissingInputObjectTypesForAggregate } from './aggregate-helpers';
import { addMissingInputObjectTypesForInclude } from './include-helpers';
import { addMissingInputObjectTypesForModelArgs } from './modelArgs-helpers';
import { addMissingInputObjectTypesForMongoDbRawOpsAndQueries } from './mongodb-helpers';
import { addMissingInputObjectTypesForSelect } from './select-helpers';
import { changeOptionalToRequiredFields } from './whereUniqueInput-helpers';

interface AddMissingInputObjectTypeOptions {
  isGenerateSelect: boolean;
  isGenerateInclude: boolean;
  exportTypedSchemas: boolean;
  exportZodSchemas: boolean;
  typedSchemaSuffix: string;
  zodSchemaSuffix: string;
}

export function addMissingInputObjectTypes(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
  models: DMMF.Model[],
  modelOperations: DMMF.ModelMapping[],
  dataSourceProvider: ConnectorType,
  options: AddMissingInputObjectTypeOptions,
) {
  const cfg = Transformer.getGeneratorConfig();
  const isMinimal = cfg?.mode === 'minimal';
  // TODO: remove once Prisma fix this issue: https://github.com/prisma/prisma/issues/14900
  if (dataSourceProvider === 'mongodb') {
    addMissingInputObjectTypesForMongoDbRawOpsAndQueries(
      modelOperations,
      outputObjectTypes,
      inputObjectTypes,
    );
  }

  // Filter out fieldRefTypes from input types to avoid generating non-existent schemas
  filterFieldRefTypes(inputObjectTypes);

  if (!isMinimal) {
    addMissingInputObjectTypesForAggregate(inputObjectTypes, outputObjectTypes);
  }
  if (!isMinimal && options.isGenerateSelect) {
    addMissingInputObjectTypesForSelect(inputObjectTypes, outputObjectTypes, models);
    Transformer.setIsGenerateSelect(true);
  }
  if (!isMinimal && (options.isGenerateSelect || options.isGenerateInclude)) {
    addMissingInputObjectTypesForModelArgs(
      inputObjectTypes,
      models,
      options.isGenerateSelect,
      options.isGenerateInclude,
    );
  }
  if (!isMinimal && options.isGenerateInclude) {
    addMissingInputObjectTypesForInclude(inputObjectTypes, models, options.isGenerateSelect);
    Transformer.setIsGenerateInclude(true);
  }

  changeOptionalToRequiredFields(inputObjectTypes);
}

function filterFieldRefTypes(inputObjectTypes: DMMF.InputType[]): void {
  // Filter out fieldRefTypes from input types following zod-prisma-types approach
  // This prevents generation of non-existent FieldRefInput schemas
  for (const inputType of inputObjectTypes) {
    const fields = inputType.fields as DMMF.SchemaArg[];
    for (const field of fields) {
      if (field.inputTypes.some((inputType) => inputType.location === 'fieldRefTypes')) {
        // Replace the entire inputTypes array with just the first input type
        // This removes the fieldRefTypes reference while preserving functionality
        (field as DMMF.SchemaArg & { inputTypes: DMMF.SchemaArg['inputTypes'] }).inputTypes = [
          field.inputTypes[0],
        ];
      }
    }
  }
}

export function resolveAddMissingInputObjectTypeOptions(
  generatorConfigOptions: Record<string, string>,
): AddMissingInputObjectTypeOptions {
  return {
    isGenerateSelect: generatorConfigOptions.isGenerateSelect === 'true',
    isGenerateInclude: generatorConfigOptions.isGenerateInclude === 'true',
    exportTypedSchemas:
      generatorConfigOptions.exportTypedSchemas === undefined
        ? true
        : generatorConfigOptions.exportTypedSchemas === 'true', // default true
    exportZodSchemas:
      generatorConfigOptions.exportZodSchemas === undefined
        ? true
        : generatorConfigOptions.exportZodSchemas === 'true', // default true
    typedSchemaSuffix: generatorConfigOptions.typedSchemaSuffix || 'Schema', // default 'Schema'
    zodSchemaSuffix: generatorConfigOptions.zodSchemaSuffix || 'ZodSchema', // default 'ZodSchema'
  };
}
