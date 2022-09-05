import { EnvValue, GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import Transformer from './transformer';
import removeDir from './utils/removeDir';

export async function generate(options: GeneratorOptions) {
  const outputDir = parseEnvValue(options.generator.output as EnvValue);
  await fs.mkdir(outputDir, { recursive: true });
  await removeDir(outputDir, true);

  const prismaClientProvider = options.otherGenerators.find(
    (it) => parseEnvValue(it.provider) === 'prisma-client-js',
  );

  const prismaClientDmmf = await getDMMF({
    datamodel: options.datamodel,
    previewFeatures: prismaClientProvider?.previewFeatures,
  });

  const dataSource = options.datasources?.[0];

  Transformer.isDefaultPrismaClientOutput =
    prismaClientProvider?.isCustomOutput ?? false;

  if (prismaClientProvider?.isCustomOutput) {
    Transformer.prismaClientOutputPath =
      prismaClientProvider?.output?.value ?? '';
  }

  Transformer.setOutputPath(outputDir);

  const enumTypes = [
    ...prismaClientDmmf.schema.enumTypes.prisma,
    ...(prismaClientDmmf.schema.enumTypes.model ?? []),
  ];
  const enumNames = enumTypes.map((enumItem) => enumItem.name);
  Transformer.enumNames = enumNames ?? [];
  const enumsObj = new Transformer({
    enumTypes,
  });
  await enumsObj.printEnumSchemas();

  const inputObjectTypes = prismaClientDmmf.schema.inputObjectTypes.prisma;
  const rawOpsMap: { [name: string]: string } = {};

  /* 
  TODO: remove once Prisma fix this issue: https://github.com/prisma/prisma/issues/14900
  */
  if (dataSource.provider === 'mongodb') {
    const modelNames = prismaClientDmmf.mappings.modelOperations.map(
      (item) => item.model,
    );
    const rawOpsNames = [
      ...new Set(
        prismaClientDmmf.mappings.modelOperations.reduce<string[]>(
          (result, current) => {
            const keys = Object.keys(current);
            keys?.forEach((key) => {
              if (key.includes('Raw')) {
                result.push(key);
              }
            });
            return result;
          },
          [],
        ),
      ),
    ];

    rawOpsNames.forEach((opName) => {
      modelNames.forEach((modelName) => {
        const isFind = opName === 'findRaw';
        const opWithModel = `${opName.replace('Raw', '')}${modelName}Raw`;
        rawOpsMap[opWithModel] = isFind
          ? `${modelName}FindRawArgs`
          : `${modelName}AggregateRawArgs`;
      });
    });

    Transformer.rawOpsMap = rawOpsMap ?? {};

    const queryOutputTypes =
      prismaClientDmmf.schema.outputObjectTypes.prisma.filter(
        (item) => item.name === 'Query',
      );

    const mongodbRawQueries =
      queryOutputTypes?.[0].fields.filter((field) =>
        field.name.includes('Raw'),
      ) ?? [];

    mongodbRawQueries.forEach((item) => {
      inputObjectTypes.push({
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
      });
    });
  }

  Transformer.provider = dataSource.provider;

  for (let i = 0; i < inputObjectTypes.length; i += 1) {
    const fields = inputObjectTypes[i]?.fields;
    const name = inputObjectTypes[i]?.name;
    const obj = new Transformer({ name, fields });
    await obj.printObjectSchemas();
  }

  const obj = new Transformer({
    modelOperations: prismaClientDmmf.mappings.modelOperations,
  });
  await obj.printModelSchemas();
}
