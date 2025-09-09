import { DMMF } from '@prisma/generator-helper';
import Transformer from '../transformer';
import { isOperationEnabledForModel } from './model-helpers';

const isAggregateOutputType = (name: string) =>
  /(?:Count|Avg|Sum|Min|Max)AggregateOutputType$/.test(name);

export const isAggregateInputType = (name: string) =>
  name.endsWith('CountAggregateInput') ||
  name.endsWith('SumAggregateInput') ||
  name.endsWith('AvgAggregateInput') ||
  name.endsWith('MinAggregateInput') ||
  name.endsWith('MaxAggregateInput');

/**
 * Extract model name from aggregate type name
 * Examples: UserCountAggregateOutputType -> User, PostAvgAggregateOutputType -> Post
 */
function extractModelNameFromAggregateType(typeName: string): string {
  return typeName.replace(/(Count|Avg|Sum|Min|Max)Aggregate(?:Input|Output|OutputType)?$/, '');
}

export function addMissingInputObjectTypesForAggregate(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
) {
  const aggregateOutputTypes = outputObjectTypes.filter(({ name }) => isAggregateOutputType(name));

  for (const aggregateOutputType of aggregateOutputTypes) {
    const name = aggregateOutputType.name.replace(/(?:OutputType|Output)$/, '');

    // Extract model name from aggregate type name
    const modelName = extractModelNameFromAggregateType(name);

    // Skip if model is disabled or aggregate operation is not enabled
    if (
      !Transformer.isModelEnabled(modelName) ||
      !isOperationEnabledForModel(modelName, 'aggregate')
    ) {
      continue;
    }

    // Filter fields based on field-level filtering for result variant
    const filteredFields = aggregateOutputType.fields.filter((field) => {
      return Transformer.isFieldEnabled(field.name, modelName, 'result');
    });

    // Only add the input type if there are enabled fields
    if (filteredFields.length > 0) {
      inputObjectTypes.push({
        constraints: { maxNumFields: null, minNumFields: null },
        name: `${name}Input`,
        fields: filteredFields.map((field) => ({
          name: field.name,
          isNullable: false,
          isRequired: false,
          inputTypes: [
            {
              isList: false,
              type: 'True',
              location: 'scalar',
            },
          ],
        })),
      });
    }
  }
}

// Aggregate support detection removed - simplified to assume all models support count, min, max

/**
 * Check if aggregate operations should be generated for a model
 */
export function shouldGenerateAggregateForModel(modelName: string): boolean {
  return (
    Transformer.isModelEnabled(modelName) && isOperationEnabledForModel(modelName, 'aggregate')
  );
}

/**
 * Filter aggregate input types based on model and operation filtering
 */
export function filterAggregateInputTypes(inputTypes: DMMF.InputType[]): DMMF.InputType[] {
  return inputTypes.filter((inputType) => {
    if (!isAggregateInputType(inputType.name)) {
      return true; // Keep non-aggregate input types
    }

    const modelName = extractModelNameFromAggregateType(inputType.name);
    return shouldGenerateAggregateForModel(modelName);
  });
}
