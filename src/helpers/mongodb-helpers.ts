import { DMMF } from '@prisma/generator-helper';
import Transformer from '../transformer';
import { isOperationEnabledForModel } from './model-helpers';

export function addMissingInputObjectTypesForMongoDbRawOpsAndQueries(
  modelOperations: DMMF.ModelMapping[],
  outputObjectTypes: DMMF.OutputType[],
  inputObjectTypes: DMMF.InputType[],
) {
  const rawOpsMap = resolveMongoDbRawOperations(modelOperations);
  Transformer.rawOpsMap = rawOpsMap ?? {};

  const mongoDbRawQueryInputObjectTypes = resolveMongoDbRawQueryInputObjectTypes(outputObjectTypes);
  for (const mongoDbRawQueryInputType of mongoDbRawQueryInputObjectTypes) {
    inputObjectTypes.push(mongoDbRawQueryInputType);
  }
}

function resolveMongoDbRawOperations(modelOperations: DMMF.ModelMapping[]) {
  const rawOpsMap: { [name: string]: string } = {};

  // Filter model operations to only include enabled models
  const enabledModelOperations = modelOperations.filter((operation) =>
    Transformer.isModelEnabled(operation.model),
  );

  const rawOpsNames = [
    ...new Set(
      enabledModelOperations.reduce<string[]>((result, current) => {
        const keys = Object.keys(current);
        keys?.forEach((key) => {
          if (key.includes('Raw')) {
            result.push(key);
          }
        });
        return result;
      }, []),
    ),
  ];

  const modelNames = enabledModelOperations.map((item) => item.model);

  rawOpsNames.forEach((opName) => {
    modelNames.forEach((modelName) => {
      // Check if the specific raw operation is enabled for this model
      const operation = opName === 'findRaw' ? 'findRaw' : 'aggregateRaw';
      if (!isMongoDbRawOperationEnabledForModel(modelName, operation)) {
        return; // Skip this operation if not enabled
      }

      const isFind = opName === 'findRaw';
      const opWithModel = `${opName.replace('Raw', '')}${modelName}Raw`;
      rawOpsMap[opWithModel] = isFind ? `${modelName}FindRawArgs` : `${modelName}AggregateRawArgs`;
    });
  });

  return rawOpsMap;
}

function resolveMongoDbRawQueryInputObjectTypes(outputObjectTypes: DMMF.OutputType[]) {
  const mongoDbRawQueries = getFilteredMongoDbRawQueries(outputObjectTypes);
  const mongoDbRawQueryInputObjectTypes = mongoDbRawQueries.map((item) => ({
    name: item.name,
    constraints: {
      maxNumFields: null,
      minNumFields: null,
    },
    fields: item.args.map((arg) => ({
      name: arg.name,
      isRequired: arg.isRequired,
      isNullable: arg.isNullable,
      inputTypes: arg.inputTypes,
    })),
  }));
  return mongoDbRawQueryInputObjectTypes;
}

function getMongoDbRawQueries(outputObjectTypes: DMMF.OutputType[]) {
  const queryOutputTypes = outputObjectTypes.filter((item) => item.name === 'Query');

  const mongodbRawQueries =
    queryOutputTypes?.[0].fields.filter((field) => field.name.includes('Raw')) ?? [];

  return mongodbRawQueries;
}

function getFilteredMongoDbRawQueries(outputObjectTypes: DMMF.OutputType[]) {
  const mongoDbRawQueries = getMongoDbRawQueries(outputObjectTypes);

  return mongoDbRawQueries.filter((field) => {
    // Extract model name from raw query field name
    // Examples: "findUserRaw" -> "User", "aggregatePostRaw" -> "Post"
    const modelName = extractModelNameFromRawQuery(field.name);
    if (!modelName) return true; // Keep queries we can't parse

    // Check if model is enabled and raw operations are allowed
    if (!Transformer.isModelEnabled(modelName)) {
      return false;
    }

    // Check if specific raw operation is enabled for this model
    const operation = field.name.includes('find') ? 'findRaw' : 'aggregateRaw';
    return isMongoDbRawOperationEnabledForModel(modelName, operation);
  });
}

export const isMongodbRawOp = (name: string) =>
  /find([^]*?)Raw/.test(name) || /aggregate([^]*?)Raw/.test(name);

/**
 * Extract model name from MongoDB raw query field name
 * Examples: "findUserRaw" -> "User", "aggregatePostRaw" -> "Post"
 */
function extractModelNameFromRawQuery(fieldName: string): string | null {
  const findMatch = fieldName.match(/find([A-Z][a-zA-Z]*)Raw/);
  if (findMatch) {
    return findMatch[1];
  }

  const aggregateMatch = fieldName.match(/aggregate([A-Z][a-zA-Z]*)Raw/);
  if (aggregateMatch) {
    return aggregateMatch[1];
  }

  return null;
}

/**
 * Check if a MongoDB raw operation is enabled for a model
 */
function isMongoDbRawOperationEnabledForModel(
  modelName: string,
  operation: 'findRaw' | 'aggregateRaw',
): boolean {
  // Check if the equivalent standard operation is enabled
  // findRaw corresponds to findMany/findFirst, aggregateRaw corresponds to aggregate
  const standardOperation = operation === 'findRaw' ? 'findMany' : 'aggregate';
  return isOperationEnabledForModel(modelName, standardOperation);
}

/**
 * Check if MongoDB raw operations should be generated for a model
 */
export function shouldGenerateMongoDbRawOpsForModel(modelName: string): boolean {
  return (
    Transformer.isModelEnabled(modelName) &&
    (isOperationEnabledForModel(modelName, 'findMany') ||
      isOperationEnabledForModel(modelName, 'aggregate'))
  );
}
