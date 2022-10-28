import {
  DMMF,
  EnvValue,
  GeneratorConfig,
  GeneratorOptions,
} from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import Transformer from './transformer';
import removeDir from './utils/removeDir';
import {
  addMissingInputObjectTypes,
  handleMongoDbRawOperationsAndQueries,
} from './helpers';

export async function generate(options: GeneratorOptions) {
  await handleGeneratorOutputValue(options.generator.output as EnvValue);

  const prismaClientGeneratorConfig = getGeneratorConfigByProvider(
    options.otherGenerators,
    'prisma-client-js',
  );

  const prismaClientDmmf = await getDMMF({
    datamodel: options.datamodel,
    previewFeatures: prismaClientGeneratorConfig?.previewFeatures,
  });

  checkForCustomPrismaClientOutputPath(prismaClientGeneratorConfig);

  await generateEnumSchemas(
    prismaClientDmmf.schema.enumTypes.prisma,
    prismaClientDmmf.schema.enumTypes.model ?? [],
  );

  const models = prismaClientDmmf.datamodel.models;
  const modelOperations = prismaClientDmmf.mappings.modelOperations;
  const inputObjectTypes = prismaClientDmmf.schema.inputObjectTypes.prisma;
  const outputObjectTypes = prismaClientDmmf.schema.outputObjectTypes.prisma;

  const dataSource = options.datasources?.[0];
  Transformer.provider = dataSource.provider;

  // TODO: remove once Prisma fix this issue: https://github.com/prisma/prisma/issues/14900
  if (dataSource.provider === 'mongodb') {
    handleMongoDbRawOperationsAndQueries(
      modelOperations,
      outputObjectTypes,
      inputObjectTypes,
    );
  }

  addMissingInputObjectTypes(inputObjectTypes, outputObjectTypes, models);
  await generateObjectSchemas(inputObjectTypes);

  await generateModelSchemas(modelOperations);
}

async function handleGeneratorOutputValue(generatorOuputValue: EnvValue) {
  const outputDirectoryPath = parseEnvValue(generatorOuputValue);

  // create the output directory and delete contents that might exist from a previous run
  await fs.mkdir(outputDirectoryPath, { recursive: true });
  const isRemoveContentsOnly = true;
  await removeDir(outputDirectoryPath, isRemoveContentsOnly);

  Transformer.setOutputPath(outputDirectoryPath);
}

function getGeneratorConfigByProvider(
  generators: GeneratorConfig[],
  provider: string,
) {
  return generators.find((it) => parseEnvValue(it.provider) === provider);
}

function checkForCustomPrismaClientOutputPath(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
) {
  if (prismaClientGeneratorConfig?.isCustomOutput) {
    Transformer.setPrismaClientOutputPath(
      prismaClientGeneratorConfig.output?.value as string,
    );
  }
}

async function generateEnumSchemas(
  prismaSchemaEnum: DMMF.SchemaEnum[],
  modelSchemaEnum: DMMF.SchemaEnum[],
) {
  const enumTypes = [...prismaSchemaEnum, ...modelSchemaEnum];
  const enumNames = enumTypes.map((enumItem) => enumItem.name);
  Transformer.enumNames = enumNames ?? [];
  const transformer = new Transformer({
    enumTypes,
  });
  await transformer.generateEnumSchemas();
}

async function generateObjectSchemas(inputObjectTypes: DMMF.InputType[]) {
  for (let i = 0; i < inputObjectTypes.length; i += 1) {
    const fields = inputObjectTypes[i]?.fields;
    const name = inputObjectTypes[i]?.name;
    const transformer = new Transformer({ name, fields });
    await transformer.generateObjectSchema();
  }
}

async function generateModelSchemas(modelOperations: DMMF.ModelMapping[]) {
  const transformer = new Transformer({
    modelOperations,
  });
  await transformer.generateModelSchemas();
}
