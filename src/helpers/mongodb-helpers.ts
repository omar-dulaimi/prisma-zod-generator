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

  // Register the exact operation names Prisma exposes in its model mappings
  // (DMMF.ModelMapping.findRaw / aggregateRaw). Reconstructing names from
  // substring heuristics false-positives on models whose own name contains
  // 'Raw' (e.g. model MaterialRaw: findFirstMaterialRaw is NOT a raw op).
  for (const mapping of enabledModelOperations) {
    const modelName = mapping.model;
    if (mapping.findRaw && isMongoDbRawOperationEnabledForModel(modelName, 'findRaw')) {
      rawOpsMap[mapping.findRaw] = `${modelName}FindRawArgs`;
    }
    if (mapping.aggregateRaw && isMongoDbRawOperationEnabledForModel(modelName, 'aggregateRaw')) {
      rawOpsMap[mapping.aggregateRaw] = `${modelName}AggregateRawArgs`;
    }
  }

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

  // Match Query fields against the exact raw-op names registered in rawOpsMap
  // (assigned before this runs). A substring check on 'Raw' would sweep in every
  // regular operation of models whose name contains 'Raw'.
  const mongodbRawQueries =
    queryOutputTypes?.[0].fields.filter((field) => isMongodbRawOp(field.name)) ?? [];

  return mongodbRawQueries;
}

function getFilteredMongoDbRawQueries(outputObjectTypes: DMMF.OutputType[]) {
  // Model and per-operation enablement is already applied while building
  // Transformer.rawOpsMap, which getMongoDbRawQueries matches against.
  return getMongoDbRawQueries(outputObjectTypes);
}

export const isMongodbRawOp = (name: string) =>
  Object.prototype.hasOwnProperty.call(Transformer.rawOpsMap, name);

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
