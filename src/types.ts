import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';

export type TransformerParams = {
  enumTypes?: SchemaEnumWithValues[];
  fields?: PrismaDMMF.SchemaArg[];
  name?: string;
  models?: PrismaDMMF.Model[];
  modelOperations?: PrismaDMMF.ModelMapping[];
  isDefaultPrismaClientOutput?: boolean;
  prismaClientOutputPath?: string;
};

export type SchemaEnumWithValues = PrismaDMMF.SchemaEnum & { values: string[] };
