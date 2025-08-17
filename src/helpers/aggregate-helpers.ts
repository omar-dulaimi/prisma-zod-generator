import { DMMF } from '@prisma/generator-helper';
import { AggregateOperationSupport } from '../types';
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

export function resolveAggregateOperationSupport(inputObjectTypes: DMMF.InputType[]) {
  const aggregateOperationSupport: AggregateOperationSupport = {};
  for (const inputType of inputObjectTypes) {
    if (isAggregateInputType(inputType.name)) {
      const name = inputType.name.replace('AggregateInput', '');
      let model = '';
      let operation = '';

      if (name.endsWith('Count')) {
        model = name.replace('Count', '');
        operation = 'count';
      } else if (name.endsWith('Min')) {
        model = name.replace('Min', '');
        operation = 'min';
      } else if (name.endsWith('Max')) {
        model = name.replace('Max', '');
        operation = 'max';
      } else if (name.endsWith('Sum')) {
        model = name.replace('Sum', '');
        operation = 'sum';
      } else if (name.endsWith('Avg')) {
        model = name.replace('Avg', '');
        operation = 'avg';
      }

      // Only include support for enabled models and operations
      if (
        model &&
        operation &&
        Transformer.isModelEnabled(model) &&
        isOperationEnabledForModel(model, 'aggregate')
      ) {
        aggregateOperationSupport[model] = {
          ...aggregateOperationSupport[model],
          [operation]: true,
        };
      }
    }
  }
  return aggregateOperationSupport;
}

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
