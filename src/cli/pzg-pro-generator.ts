/**
 * PZG Pro Generator Implementation
 *
 * This is the main generator logic for PZG Pro features.
 * It follows the same pattern as the main prisma-zod-generator:
 * 1. Gets DMMF once from Prisma
 * 2. Parses configuration
 * 3. Passes DMMF to all pro features efficiently
 */

import { GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import path from 'path';
import { getLicenseStatus, describePlan } from '../license';

// Import pro features (mixed: some DMMF-based, some schemaPath-based)
import { generatePoliciesFromDMMF } from '../pro/features/policies/policies';
import { generateServerActionsFromDMMF } from '../pro/features/server-actions/server-actions';
import { generateAPIDocsFromDMMF } from '../pro/features/api-docs/api-docs';
import { generateContractTestsFromDMMF } from '../pro/features/contract-testing/contract-testing';
import { generateDataFactories } from '../pro/features/data-factories/data-factories';
import { generateMultiTenantKitFromDMMF } from '../pro/features/multi-tenant-kit/multi-tenant-kit';
import { generatePerformancePack } from '../pro/features/performance-pack/performance-pack';
import { generatePostgresRLSFromDMMF } from '../pro/features/postgres-rls/postgres-rls';
import { generateSDKFromDMMF } from '../pro/features/sdk-publisher/sdk-publisher';
import { generateFormUXFromDMMF } from '../pro/features/form-ux/form-ux';

interface ProFeaturesConfig {
  // Feature enablement flags
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

  // Feature-specific configurations
  policies?: any;
  serverActions?: any;
  sdk?: any;
  contracts?: any;
  postgresRls?: any;
  forms?: any;
  apiDocs?: any;
  multiTenant?: any;
  performance?: any;
  factories?: any;

  // Global settings
  outputPath?: string;
  configPath?: string;
}

export async function generateProFeatures(options: GeneratorOptions) {
  try {
    console.log('🚀 Starting PZG Pro Generator...');

    // Check license first
    const licenseStatus = await getLicenseStatus();
    if (!licenseStatus.valid) {
      throw new Error(
        'PZG Pro license required. Visit https://omar-dulaimi.github.io/prisma-zod-generator/pricing to get a license.',
      );
    }
    if (licenseStatus.plan) {
      console.log(
        `✅ Valid PZG Pro license (${describePlan(licenseStatus.plan)} (${licenseStatus.plan}))`,
      );
    } else {
      console.log('✅ Valid PZG Pro license');
    }

    // Get Prisma Client generator config to access preview features
    const prismaClientGeneratorConfig = options.otherGenerators.find(
      (gen) =>
        parseEnvValue(gen.provider) === 'prisma-client-js' ||
        parseEnvValue(gen.provider) === 'prisma-client',
    );

    if (!prismaClientGeneratorConfig) {
      throw new Error('prisma-client-js or prisma-client generator is required');
    }

    // Get DMMF once - this is the key optimization
    const dmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientGeneratorConfig.previewFeatures,
    });

    console.log(
      `📋 Analyzed schema: ${dmmf.datamodel.models.length} models, ${dmmf.schema.enumTypes.prisma.length + (dmmf.schema.enumTypes.model?.length || 0)} enums`,
    );

    // Parse configuration
    const config = await parseProConfig(options);

    // Create output directory
    const outputPath =
      config.outputPath || path.join(path.dirname(options.schemaPath), 'generated', 'pro');
    await fs.mkdir(outputPath, { recursive: true });

    // Get provider and preview features
    const dataSource = options.datasources?.[0];
    const provider = dataSource?.provider || 'postgresql';
    const previewFeatures = prismaClientGeneratorConfig.previewFeatures;

    // Get Prisma client path
    const prismaClientPath = getPrismaClientPath(prismaClientGeneratorConfig);

    console.log(`📁 Output directory: ${outputPath}`);
    console.log(`🔧 Database provider: ${provider}`);

    // Track which features are enabled
    const enabledFeatures: string[] = [];

    // Generate features in parallel where possible
    const featurePromises: Promise<void>[] = [];

    if (config.enablePolicies) {
      enabledFeatures.push('Policies & Redaction');
      featurePromises.push(
        generatePoliciesFromDMMF(
          dmmf,
          {} as any, // generatorConfig - we'll use a basic config for now
          options.schemaPath,
          path.join(outputPath, 'policies'),
          prismaClientPath,
          provider,
          config.policies || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ Policies generation failed:', error);
          // Don't throw - continue with other features
        }),
      );
    }

    if (config.enableServerActions) {
      enabledFeatures.push('Server Actions');
      featurePromises.push(
        generateServerActionsFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'server-actions'),
          prismaClientPath,
          provider,
          config.serverActions || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ Server Actions generation failed:', error);
        }),
      );
    }

    if (config.enableSDK) {
      enabledFeatures.push('Client SDK');
      featurePromises.push(
        generateSDKFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'sdk'),
          prismaClientPath,
          provider,
          config.sdk || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ SDK generation failed:', error);
        }),
      );
    }

    if (config.enableContracts) {
      enabledFeatures.push('Contract Testing');
      featurePromises.push(
        generateContractTestsFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'contracts'),
          prismaClientPath,
          provider,
          config.contracts || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ Contract Testing generation failed:', error);
        }),
      );
    }

    if (config.enablePostgresRLS) {
      enabledFeatures.push('PostgreSQL RLS');
      featurePromises.push(
        generatePostgresRLSFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'postgres-rls'),
          prismaClientPath,
          provider,
          config.postgresRls || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ PostgreSQL RLS generation failed:', error);
        }),
      );
    }

    if (config.enableForms) {
      enabledFeatures.push('Form UX');
      featurePromises.push(
        generateFormUXFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'forms'),
          prismaClientPath,
          provider,
          config.forms || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ Form UX generation failed:', error);
        }),
      );
    }

    if (config.enableApiDocs) {
      enabledFeatures.push('API Documentation');
      featurePromises.push(
        generateAPIDocsFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'api-docs'),
          prismaClientPath,
          provider,
          config.apiDocs || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ API Documentation generation failed:', error);
        }),
      );
    }

    if (config.enableMultiTenant) {
      enabledFeatures.push('Multi-Tenant Kit');
      featurePromises.push(
        generateMultiTenantKitFromDMMF(
          dmmf,
          {} as any,
          options.schemaPath,
          path.join(outputPath, 'multi-tenant'),
          prismaClientPath,
          provider,
          config.multiTenant || {},
          previewFeatures,
        ).catch((error) => {
          console.error('❌ Multi-Tenant Kit generation failed:', error);
        }),
      );
    }

    if (config.enablePerformance) {
      enabledFeatures.push('Performance Pack');
      featurePromises.push(
        generatePerformancePack(options.schemaPath, {
          outputPath: path.join(outputPath, 'performance'),
          ...config.performance,
        }).catch((error) => {
          console.error('❌ Performance Pack generation failed:', error);
        }),
      );
    }

    if (config.enableFactories) {
      enabledFeatures.push('Data Factories');
      featurePromises.push(
        generateDataFactories(options.schemaPath, {
          outputPath: path.join(outputPath, 'factories'),
          ...config.factories,
        }).catch((error) => {
          console.error('❌ Data Factories generation failed:', error);
        }),
      );
    }

    // Wait for all features to complete
    await Promise.allSettled(featurePromises);

    // Summary
    console.log('\n✅ PZG Pro Generation Complete!');
    if (enabledFeatures.length > 0) {
      console.log(`📦 Generated features: ${enabledFeatures.join(', ')}`);
    } else {
      console.log('⚠️  No features enabled. Configure features in your generator config.');
      console.log('\nExample configuration:');
      console.log('generator pzgPro {');
      console.log('  provider = "node ./lib/cli/pzg-pro.js"');
      console.log('  output = "./generated/pro"');
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

/**
 * Parse PZG Pro configuration from generator options
 */
async function parseProConfig(options: GeneratorOptions): Promise<ProFeaturesConfig> {
  const config: ProFeaturesConfig = {
    // Default: enable no features (user must explicitly enable)
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

  // Parse generator config
  const generatorConfig = options.generator.config as Record<string, any>;

  // Parse boolean flags
  const booleanFlags = [
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
      config[flag as keyof ProFeaturesConfig] = String(generatorConfig[flag]) === 'true';
    }
  }

  // Parse string configurations
  if (generatorConfig.outputPath) {
    config.outputPath = String(generatorConfig.outputPath);
  }

  // Parse contract-specific configuration (map contracts* prefixed keys to contracts object)
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

      // Parse comma-separated values into arrays for providers and consumers
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

    // Load external config file
    try {
      const schemaBaseDir = path.dirname(options.schemaPath);
      const configFilePath = path.isAbsolute(config.configPath)
        ? config.configPath
        : path.resolve(schemaBaseDir, config.configPath);

      const externalConfig = JSON.parse(await fs.readFile(configFilePath, 'utf-8'));
      Object.assign(config, externalConfig);
    } catch (error) {
      console.warn(`⚠️  Failed to load external config: ${error}`);
    }
  }

  // Parse feature-specific configs (pass through any other configs)
  const featureKeys = [
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
    if (generatorConfig[key]) {
      try {
        config[key as keyof ProFeaturesConfig] =
          typeof generatorConfig[key] === 'string'
            ? JSON.parse(generatorConfig[key])
            : generatorConfig[key];
      } catch {
        // If it's not valid JSON, pass it through as-is
        config[key as keyof ProFeaturesConfig] = generatorConfig[key];
      }
    }
  }

  return config;
}

/**
 * Get the Prisma client import path
 */
function getPrismaClientPath(prismaClientGeneratorConfig: any): string {
  if (prismaClientGeneratorConfig?.output?.value) {
    const outputPath = parseEnvValue(prismaClientGeneratorConfig.output);
    return outputPath;
  }
  return '@prisma/client';
}
