import {
  DMMF,
  EnvValue,
  GeneratorConfig,
  GeneratorOptions,
} from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import {
  addMissingInputObjectTypes,
  hideInputObjectTypesAndRelatedFields,
  resolveAddMissingInputObjectTypeOptions,
  resolveModelsComments,
} from './helpers';
import { resolveAggregateOperationSupport } from './helpers/aggregate-helpers';
import Transformer from './transformer';
import { AggregateOperationSupport } from './types';
import removeDir from './utils/removeDir';

export async function generate(options: GeneratorOptions) {
  try {
    await handleGeneratorOutputValue(options.generator.output as EnvValue);

    const prismaClientGeneratorConfig =
      getGeneratorConfigByProvider(
        options.otherGenerators,
        'prisma-client-js',
      ) ||
      getGeneratorConfigByProvider(options.otherGenerators, 'prisma-client');

    if (!prismaClientGeneratorConfig) {
      throw new Error(
        'Prisma Zod Generator requires either "prisma-client-js" or "prisma-client" generator to be present in your schema.prisma file.\n\n' +
          'Please add one of the following to your schema.prisma:\n\n' +
          '// For the legacy generator:\n' +
          'generator client {\n' +
          '  provider = "prisma-client-js"\n' +
          '}\n\n' +
          '// Or for the new generator (Prisma 6.12.0+):\n' +
          'generator client {\n' +
          '  provider = "prisma-client"\n' +
          '}',
      );
    }

    const prismaClientDmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientGeneratorConfig?.previewFeatures,
    });

    checkForCustomPrismaClientOutputPath(prismaClientGeneratorConfig);
    setPrismaClientProvider(prismaClientGeneratorConfig);
    setPrismaClientConfig(prismaClientGeneratorConfig);

    const modelOperations = prismaClientDmmf.mappings.modelOperations;
    const inputObjectTypes = prismaClientDmmf.schema.inputObjectTypes.prisma;
    // Filter out AndReturn types that were introduced in Prisma 6 but shouldn't have Zod schemas
    const outputObjectTypes =
      prismaClientDmmf.schema.outputObjectTypes.prisma.filter(
        (type) => !type.name.includes('AndReturn'),
      );
    const enumTypes = prismaClientDmmf.schema.enumTypes;
    const models: DMMF.Model[] = [...prismaClientDmmf.datamodel.models];
    const mutableModelOperations = [...modelOperations];
    const mutableEnumTypes = {
      model: enumTypes.model ? [...enumTypes.model] : undefined,
      prisma: [...enumTypes.prisma],
    };
    const hiddenModels: string[] = [];
    const hiddenFields: string[] = [];
    resolveModelsComments(
      models,
      mutableModelOperations,
      mutableEnumTypes,
      hiddenModels,
      hiddenFields,
    );

    await generateEnumSchemas(
      mutableEnumTypes.prisma,
      mutableEnumTypes.model ?? [],
    );

    const dataSource = options.datasources?.[0];
    const previewFeatures = prismaClientGeneratorConfig?.previewFeatures;
    Transformer.provider = dataSource.provider;
    Transformer.previewFeatures = previewFeatures;

    const generatorConfigOptions = options.generator.config;

    const addMissingInputObjectTypeOptions =
      resolveAddMissingInputObjectTypeOptions(
        generatorConfigOptions as Record<string, string>,
      );

    const mutableInputObjectTypes = [...inputObjectTypes];
    const mutableOutputObjectTypes = [...outputObjectTypes];

    addMissingInputObjectTypes(
      mutableInputObjectTypes,
      mutableOutputObjectTypes,
      models,
      mutableModelOperations,
      dataSource.provider,
      addMissingInputObjectTypeOptions,
    );

    const aggregateOperationSupport = resolveAggregateOperationSupport(
      mutableInputObjectTypes,
    );

    hideInputObjectTypesAndRelatedFields(
      mutableInputObjectTypes,
      hiddenModels,
      hiddenFields,
    );
    await generateObjectSchemas(mutableInputObjectTypes);
    await generateModelSchemas(
      models,
      mutableModelOperations,
      aggregateOperationSupport,
    );
    await generateIndex();
  } catch (error) {
    console.error(error);
  }
}

async function handleGeneratorOutputValue(generatorOutputValue: EnvValue) {
  const outputDirectoryPath = parseEnvValue(generatorOutputValue);

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

function setPrismaClientProvider(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
) {
  if (prismaClientGeneratorConfig?.provider) {
    Transformer.setPrismaClientProvider(
      parseEnvValue(prismaClientGeneratorConfig.provider),
    );
  }
}

function setPrismaClientConfig(
  prismaClientGeneratorConfig: GeneratorConfig | undefined,
) {
  if (prismaClientGeneratorConfig?.config) {
    Transformer.setPrismaClientConfig(prismaClientGeneratorConfig.config);
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
    const transformer = new Transformer({ name, fields: [...(fields || [])] });
    await transformer.generateObjectSchema();
  }
}

async function generateModelSchemas(
  models: DMMF.Model[],
  modelOperations: DMMF.ModelMapping[],
  aggregateOperationSupport: AggregateOperationSupport,
) {
  const transformer = new Transformer({
    models,
    modelOperations,
    aggregateOperationSupport,
  });
  await transformer.generateModelSchemas();
}

async function generateIndex() {
  await Transformer.generateIndex();
}
