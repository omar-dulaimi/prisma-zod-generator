import { DMMF as PrismaDMMF } from '@prisma/client/runtime/library';

export type TransformerParams = {
  enumTypes?: PrismaDMMF.SchemaEnum[];
  fields?: PrismaDMMF.SchemaArg[];
  name?: string;
  models?: PrismaDMMF.Model[];
  modelOperations?: PrismaDMMF.ModelMapping[];
  isDefaultPrismaClientOutput?: boolean;
  prismaClientOutputPath?: string;
};

