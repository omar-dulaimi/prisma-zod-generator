/**
 * PZG Pro Generator Implementation
 *
 * This matches the main prisma-zod-generator pattern but loads Pro feature
 * modules lazily so the OSS build compiles without the private submodule.
 */

import type { GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import path from 'path';
import { describePlan, getLicenseStatus } from '../license';

export const PRO_HELP_MESSAGE = [
  'PZG Pro modules are not available in this repository.',
  'To enable Pro features:',
  '  1. Purchase a PZG Pro license',
  '  2. Initialize the private submodule:',
  '       git submodule update --init --recursive',
  '  3. Re-run your command',
  'Docs & pricing: https://omar-dulaimi.github.io/prisma-zod-generator/pricing',
].join('\n');

type FeatureGenerator = (...args: any[]) => Promise<void>;

interface FeatureModules {
  generatePoliciesFromDMMF: FeatureGenerator;
  generateServerActionsFromDMMF: FeatureGenerator;
  generateSDKFromDMMF: FeatureGenerator;
  generateContractTestsFromDMMF: FeatureGenerator;
  generatePostgresRLSFromDMMF: FeatureGenerator;
  generateFormUXFromDMMF: FeatureGenerator;
  generateAPIDocsFromDMMF: FeatureGenerator;
  generateMultiTenantKitFromDMMF: FeatureGenerator;
  generatePerformancePack: FeatureGenerator;
  generateDataFactories: FeatureGenerator;
}

interface ProFeaturesConfig {
  enablePolicies?: boolean;
  enableServerActions?: boolean;
  enableSDK?: boolean;
  enableContracts?: boolean;
  enablePostgresRLS?: boolean;
  enableForms?: boolean;
  enableApiDocs?: boolean;
  enableMultiTenant?: boolean;
  enablePerformance?: boolean;
  enableFactories?: boolean;

  policies?: unknown;
  serverActions?: unknown;
  sdk?: unknown;
  contracts?: any;
  postgresRls?: unknown;
  forms?: unknown;
  apiDocs?: unknown;
  multiTenant?: unknown;
  performance?: unknown;
  factories?: unknown;

  outputPath?: string;
  configPath?: string;
}

export async function generateProFeatures(options: GeneratorOptions): Promise<void> {
  try {
    console.log('🚀 Starting PZG Pro Generator...');

    const licenseStatus = await getLicenseStatus();
    if (!licenseStatus.valid) {
      throwProMissing();
    }

    if (licenseStatus.plan) {
      console.log(
        `✅ Valid PZG Pro license (${describePlan(licenseStatus.plan)} (${licenseStatus.plan}))`,
      );
    } else {
      console.log('✅ Valid PZG Pro license');
    }

    const prismaClientGeneratorConfig = options.otherGenerators.find(
      (gen) =>
        parseEnvValue(gen.provider) === 'prisma-client-js' ||
        parseEnvValue(gen.provider) === 'prisma-client',
    );

    if (!prismaClientGeneratorConfig) {
      throw new Error('prisma-client-js or prisma-client generator is required');
    }

    const dmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientGeneratorConfig.previewFeatures,
    });

    console.log(
      `📋 Analyzed schema: ${dmmf.datamodel.models.length} models, ${
        dmmf.schema.enumTypes.prisma.length + (dmmf.schema.enumTypes.model?.length || 0)
      } enums`,
    );

    const config = await parseProConfig(options);
    const outputPath =
      config.outputPath || path.join(path.dirname(options.schemaPath), 'generated', 'pro');
    await fs.mkdir(outputPath, { recursive: true });

    const dataSource = options.datasources?.[0];
    const provider = dataSource?.provider || 'postgresql';
    const previewFeatures = prismaClientGeneratorConfig.previewFeatures;
    const prismaClientPath = getPrismaClientPath(prismaClientGeneratorConfig);

    console.log(`📁 Output directory: ${outputPath}`);
    console.log(`🔧 Database provider: ${provider}`);

    const features = loadFeatureModules();
    const enabledFeatures: string[] = [];
    const featurePromises: Promise<void>[] = [];

    if (config.enablePolicies) {
      enabledFeatures.push('Policies & Redaction');
      featurePromises.push(
        features
          .generatePoliciesFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'policies'),
            prismaClientPath,
            provider,
            config.policies ?? {},
            previewFeatures,
          )
          .catch((error: unknown) => handleFeatureError('Policies generation failed', error)),
      );
    }

    if (config.enableServerActions) {
      enabledFeatures.push('Server Actions');
      featurePromises.push(
        features
          .generateServerActionsFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'server-actions'),
            prismaClientPath,
            provider,
            config.serverActions ?? {},
            previewFeatures,
          )
          .catch((error: unknown) => handleFeatureError('Server Actions generation failed', error)),
      );
    }

    if (config.enableSDK) {
      enabledFeatures.push('Client SDK');
      featurePromises.push(
        features
          .generateSDKFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'sdk'),
            prismaClientPath,
            provider,
            config.sdk ?? {},
            previewFeatures,
          )
          .catch((error: unknown) => handleFeatureError('SDK generation failed', error)),
      );
    }

    if (config.enableContracts) {
      enabledFeatures.push('Contract Testing');
      featurePromises.push(
        features
          .generateContractTestsFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'contracts'),
            prismaClientPath,
            provider,
            config.contracts ?? {},
            previewFeatures,
          )
          .catch((error: unknown) =>
            handleFeatureError('Contract Testing generation failed', error),
          ),
      );
    }

    if (config.enablePostgresRLS) {
      enabledFeatures.push('PostgreSQL RLS');
      featurePromises.push(
        features
          .generatePostgresRLSFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'postgres-rls'),
            prismaClientPath,
            provider,
            config.postgresRls ?? {},
            previewFeatures,
          )
          .catch((error: unknown) => handleFeatureError('PostgreSQL RLS generation failed', error)),
      );
    }

    if (config.enableForms) {
      enabledFeatures.push('Form UX');
      featurePromises.push(
        features
          .generateFormUXFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'forms'),
            prismaClientPath,
            provider,
            config.forms ?? {},
            previewFeatures,
          )
          .catch((error: unknown) => handleFeatureError('Form UX generation failed', error)),
      );
    }

    if (config.enableApiDocs) {
      enabledFeatures.push('API Documentation');
      featurePromises.push(
        features
          .generateAPIDocsFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'api-docs'),
            prismaClientPath,
            provider,
            config.apiDocs ?? {},
            previewFeatures,
          )
          .catch((error: unknown) =>
            handleFeatureError('API Documentation generation failed', error),
          ),
      );
    }

    if (config.enableMultiTenant) {
      enabledFeatures.push('Multi-Tenant Kit');
      featurePromises.push(
        features
          .generateMultiTenantKitFromDMMF(
            dmmf,
            {},
            options.schemaPath,
            path.join(outputPath, 'multi-tenant'),
            prismaClientPath,
            provider,
            config.multiTenant ?? {},
            previewFeatures,
          )
          .catch((error: unknown) =>
            handleFeatureError('Multi-Tenant Kit generation failed', error),
          ),
      );
    }

    if (config.enablePerformance) {
      enabledFeatures.push('Performance Pack');
      featurePromises.push(
        features
          .generatePerformancePack(options.schemaPath, {
            outputPath: path.join(outputPath, 'performance'),
            ...(config.performance ?? {}),
          })
          .catch((error: unknown) =>
            handleFeatureError('Performance Pack generation failed', error),
          ),
      );
    }

    if (config.enableFactories) {
      enabledFeatures.push('Data Factories');
      featurePromises.push(
        features
          .generateDataFactories(options.schemaPath, {
            outputPath: path.join(outputPath, 'factories'),
            ...(config.factories ?? {}),
          })
          .catch((error: unknown) => handleFeatureError('Data Factories generation failed', error)),
      );
    }

    await Promise.allSettled(featurePromises);

    console.log('\n✅ PZG Pro Generation Complete!');
    if (enabledFeatures.length > 0) {
      console.log(`📦 Generated features: ${enabledFeatures.join(', ')}`);
    } else {
      console.log('⚠️  No features enabled. Configure features in your generator config.');
      console.log('\nExample configuration:');
      console.log('generator pzgPro {');
      console.log('  provider = "node ./lib/cli/pzg-pro.js"');
      console.log('  output   = "./generated/pro"');
      console.log('  enablePolicies = true');
      console.log('  enableServerActions = true');
      console.log('}');
    }
  } catch (error) {
    console.error('\n❌ PZG Pro Generation Failed:');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

function loadFeatureModules(): FeatureModules {
  return {
    generatePoliciesFromDMMF: loadProExport(
      'features/policies/policies',
      'generatePoliciesFromDMMF',
    ),
    generateServerActionsFromDMMF: loadProExport(
      'features/server-actions/server-actions',
      'generateServerActionsFromDMMF',
    ),
    generateSDKFromDMMF: loadProExport(
      'features/sdk-publisher/sdk-publisher',
      'generateSDKFromDMMF',
    ),
    generateContractTestsFromDMMF: loadProExport(
      'features/contract-testing/contract-testing',
      'generateContractTestsFromDMMF',
    ),
    generatePostgresRLSFromDMMF: loadProExport(
      'features/postgres-rls/postgres-rls',
      'generatePostgresRLSFromDMMF',
    ),
    generateFormUXFromDMMF: loadProExport('features/form-ux/form-ux', 'generateFormUXFromDMMF'),
    generateAPIDocsFromDMMF: loadProExport('features/api-docs/api-docs', 'generateAPIDocsFromDMMF'),
    generateMultiTenantKitFromDMMF: loadProExport(
      'features/multi-tenant-kit/multi-tenant-kit',
      'generateMultiTenantKitFromDMMF',
    ),
    generatePerformancePack: loadProExport(
      'features/performance-pack/performance-pack',
      'generatePerformancePack',
    ),
    generateDataFactories: loadProExport(
      'features/data-factories/data-factories',
      'generateDataFactories',
    ),
  };
}

function loadProExport<T>(moduleSuffix: string, exportName: string): T {
  const modulePath = ['..', 'pro', ...moduleSuffix.split('/')].join('/');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(modulePath);
    if (!(exportName in mod)) {
      throw new Error(`Missing export "${exportName}" in ${modulePath}`);
    }
    return mod[exportName] as T;
  } catch (error) {
    if (isMissingProModuleError(error, modulePath)) {
      throwProMissing();
    }
    throw error;
  }
}

function isMissingProModuleError(error: unknown, modulePath: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code !== 'MODULE_NOT_FOUND') {
    return false;
  }

  const normalized = modulePath.replace(/\\/g, '/');
  const message = nodeError.message?.replace(/\\/g, '/');
  return message?.includes('/pro/') || message?.includes(normalized) || false;
}

function throwProMissing(): never {
  throw new Error(PRO_HELP_MESSAGE);
}

function handleFeatureError(context: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${context}: ${detail}`);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}

async function parseProConfig(options: GeneratorOptions): Promise<ProFeaturesConfig> {
  const config: ProFeaturesConfig = {
    enablePolicies: false,
    enableServerActions: false,
    enableSDK: false,
    enableContracts: false,
    enablePostgresRLS: false,
    enableForms: false,
    enableApiDocs: false,
    enableMultiTenant: false,
    enablePerformance: false,
    enableFactories: false,
  };

  const generatorConfig = options.generator.config as Record<string, unknown>;

  const booleanFlags: Array<keyof ProFeaturesConfig> = [
    'enablePolicies',
    'enableServerActions',
    'enableSDK',
    'enableContracts',
    'enablePostgresRLS',
    'enableForms',
    'enableApiDocs',
    'enableMultiTenant',
    'enablePerformance',
    'enableFactories',
  ];

  for (const flag of booleanFlags) {
    if (generatorConfig[flag] !== undefined) {
      config[flag] = String(generatorConfig[flag]) === 'true';
    }
  }

  if (generatorConfig.outputPath) {
    config.outputPath = String(generatorConfig.outputPath);
  }

  const contractConfigKeys: string[] = [];
  for (const key in generatorConfig) {
    if (key.startsWith('contracts') && key !== 'enableContracts') {
      contractConfigKeys.push(key);
    }
  }

  if (contractConfigKeys.length > 0) {
    config.contracts = {};
    for (const key of contractConfigKeys) {
      const contractKey =
        key.replace('contracts', '').charAt(0).toLowerCase() +
        key.replace('contracts', '').slice(1);
      let value = generatorConfig[key];

      if (contractKey === 'providers' || contractKey === 'consumers') {
        value = String(value)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
      }

      config.contracts[contractKey] = value;
    }
  }

  if (generatorConfig.configPath) {
    config.configPath = String(generatorConfig.configPath);

    try {
      const schemaBaseDir = path.dirname(options.schemaPath);
      const configFilePath = path.isAbsolute(config.configPath)
        ? config.configPath
        : path.resolve(schemaBaseDir, config.configPath);

      const externalConfig = JSON.parse(await fs.readFile(configFilePath, 'utf-8'));
      Object.assign(config, externalConfig);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  Failed to load external config: ${detail}`);
    }
  }

  const featureKeys: Array<keyof ProFeaturesConfig> = [
    'policies',
    'serverActions',
    'sdk',
    'contracts',
    'postgresRls',
    'forms',
    'apiDocs',
    'multiTenant',
    'performance',
    'factories',
  ];

  for (const key of featureKeys) {
    if (generatorConfig[key] !== undefined) {
      try {
        config[key] =
          typeof generatorConfig[key] === 'string'
            ? JSON.parse(String(generatorConfig[key]))
            : generatorConfig[key];
      } catch {
        config[key] = generatorConfig[key];
      }
    }
  }

  return config;
}

function getPrismaClientPath(prismaClientGeneratorConfig: any): string {
  if (prismaClientGeneratorConfig?.output?.value) {
    const rawValue = parseEnvValue(prismaClientGeneratorConfig.output);
    const looksLikeNodeModules = rawValue?.includes('node_modules');
    if (!prismaClientGeneratorConfig.isCustomOutput || looksLikeNodeModules) {
      return '@prisma/client';
    }

    const provider = prismaClientGeneratorConfig?.provider
      ? parseEnvValue(prismaClientGeneratorConfig.provider)
      : undefined;
    let outputValue = rawValue;

    if (provider === 'prisma-client') {
      const hasExtension = path.extname(outputValue) !== '';
      if (!hasExtension && outputValue && !/\/?client(?:\.[a-z]+)?$/i.test(outputValue)) {
        outputValue = path.join(outputValue, 'client');
      }
    }

    return outputValue || '@prisma/client';
  }
  return '@prisma/client';
}
