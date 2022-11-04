import { DMMF } from '@prisma/generator-helper';

const isAggregateOutputType = (name: string) =>
  /(?:Count|Avg|Sum|Min|Max)AggregateOutputType$/.test(name);

export function addMissingInputObjectTypesForAggregate(
  inputObjectTypes: DMMF.InputType[],
  outputObjectTypes: DMMF.OutputType[],
) {
  const aggregateOutputTypes = outputObjectTypes.filter(({ name }) =>
    isAggregateOutputType(name),
  );
  for (const aggregateOutputType of aggregateOutputTypes) {
    const name = aggregateOutputType.name.replace(/(?:OutputType|Output)$/, '');
    inputObjectTypes.push({
      constraints: { maxNumFields: null, minNumFields: null },
      name: `${name}Input`,
      fields: aggregateOutputType.fields.map((field) => ({
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
