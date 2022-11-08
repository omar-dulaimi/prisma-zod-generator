import { DMMF as PrismaDMMF } from '@prisma/client/runtime';
import { AggregateOperationSupport } from './helpers/aggregate-helpers';

export type TransformerParams = {
  enumTypes?: PrismaDMMF.SchemaEnum[];
  fields?: PrismaDMMF.SchemaArg[];
  name?: string;
  modelOperations?: PrismaDMMF.ModelMapping[];
  aggregateOperationSupport?: AggregateOperationSupport;
  isDefaultPrismaClientOutput?: boolean;
  prismaClientOutputPath?: string;
};
