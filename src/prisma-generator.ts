import {
  DMMF,
  EnvValue,
  GeneratorConfig,
  GeneratorOptions,
  ReadonlyDeep,
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

    const prismaClientGeneratorConfig = getGeneratorConfigByProvider(
      options.otherGenerators,
      'prisma-client-js',
    );

    const prismaClientDmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientGeneratorConfig?.previewFeatures,
    });

    checkForCustomPrismaClientOutputPath(prismaClientGeneratorConfig);

    const modelOperations = prismaClientDmmf.mappings
      .modelOperations as DMMF.ModelMapping[];
    const inputObjectTypes = prismaClientDmmf.schema.inputObjectTypes
      .prisma as DMMF.InputType[];
    const outputObjectTypes = prismaClientDmmf.schema.outputObjectTypes
      .prisma as DMMF.OutputType[];
    const enumTypes = prismaClientDmmf.schema.enumTypes as {
      model?: DMMF.SchemaEnum[];
      prisma: DMMF.SchemaEnum[];
    };
    const models: DMMF.Model[] = prismaClientDmmf.datamodel
      .models as DMMF.Model[];
    const hiddenModels: string[] = [];
    const hiddenFields: string[] = [];
    resolveModelsComments(
      models,
      modelOperations,
      enumTypes,
      hiddenModels,
      hiddenFields,
    );

    await generateEnumSchemas(
      prismaClientDmmf.schema.enumTypes.prisma as DMMF.SchemaEnum[],
      (prismaClientDmmf.schema.enumTypes.model ?? []) as ReadonlyDeep<{
        name: string;
        values: string[];
      }>[],
    );

    const dataSource = options.datasources?.[0];
    const previewFeatures = prismaClientGeneratorConfig?.previewFeatures;
    Transformer.provider = dataSource.provider;
    Transformer.previewFeatures = previewFeatures;

    const generatorConfigOptions = options.generator.config as {
      [key: string]: string;
    };

    const addMissingInputObjectTypeOptions =
      resolveAddMissingInputObjectTypeOptions(generatorConfigOptions);
    addMissingInputObjectTypes(
      inputObjectTypes,
      outputObjectTypes,
      models,
      modelOperations,
      dataSource.provider,
      addMissingInputObjectTypeOptions,
    );

    const aggregateOperationSupport =
      resolveAggregateOperationSupport(inputObjectTypes);

    hideInputObjectTypesAndRelatedFields(
      inputObjectTypes,
      hiddenModels,
      hiddenFields,
    );

    await generateObjectSchemas(inputObjectTypes);
    await generateModelSchemas(
      models,
      modelOperations,
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
    const fields = inputObjectTypes[i]?.fields as DMMF.SchemaArg[];
    const name = inputObjectTypes[i]?.name;
    const transformer = new Transformer({ name, fields });
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
