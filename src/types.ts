import { DMMF as PrismaDMMF } from '@prisma/generator-helper';

export type TransformerParams = {
  enumTypes?: PrismaDMMF.SchemaEnum[];
  fields?: PrismaDMMF.SchemaArg[];
  name?: string;
  models?: PrismaDMMF.Model[];
  modelOperations?: PrismaDMMF.ModelMapping[];
  aggregateOperationSupport?: AggregateOperationSupport;
  isDefaultPrismaClientOutput?: boolean;
  prismaClientOutputPath?: string;
};

export type AggregateOperationSupport = {
  [model: string]: {
    count?: boolean;
    min?: boolean;
    max?: boolean;
    sum?: boolean;
    avg?: boolean;
  };
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type MutableDeep<T> = {
  -readonly [P in keyof T]: MutableDeep<T[P]>;
}

export type DMMFSchemaEnumTypes = {
  model?: PrismaDMMF.SchemaEnum[];
  prisma: PrismaDMMF.SchemaEnum[];

}
