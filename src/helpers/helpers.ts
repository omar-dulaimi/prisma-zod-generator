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

  // Filter out fieldRefTypes from input types to avoid generating non-existent schemas
  filterFieldRefTypes(inputObjectTypes);

  addMissingInputObjectTypesForAggregate(inputObjectTypes, outputObjectTypes);
  if (options.isGenerateSelect) {
    addMissingInputObjectTypesForSelect(
      inputObjectTypes,
      outputObjectTypes,
      models,
    );
    Transformer.setIsGenerateSelect(true);
  }
  if (options.isGenerateSelect || options.isGenerateInclude) {
    addMissingInputObjectTypesForModelArgs(
      inputObjectTypes,
      models,
      options.isGenerateSelect,
      options.isGenerateInclude,
    );
  }
  if (options.isGenerateInclude) {
    addMissingInputObjectTypesForInclude(
      inputObjectTypes,
      models,
      options.isGenerateSelect,
    );
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
      if (
        field.inputTypes.some(
          (inputType) => inputType.location === 'fieldRefTypes',
        )
      ) {
        // Replace the entire inputTypes array with just the first input type
        // This removes the fieldRefTypes reference while preserving functionality
        (field as any).inputTypes = [field.inputTypes[0]];
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
  };
}
