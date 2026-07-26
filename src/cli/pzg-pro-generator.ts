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
import type { GeneratorConfig } from '../config/parser';
import { describePlan, getLicenseStatus, type LicenseFailureReason } from '../license';

export const PRO_HELP_MESSAGE = [
  'PZG Pro modules are not available in this repository.',
  'To enable Pro features:',
  '  1. Purchase a PZG Pro license',
  '  2. Initialize the private submodule:',
  '       git submodule update --init --recursive',
  '  3. Re-run your command',
  'Docs & pricing: https://omar-dulaimi.github.io/prisma-zod-generator/pricing',
].join('\n');

/**
 * Remedy text for the case where the Pro modules *are* installed but the
 * license did not validate. Distinct from PRO_HELP_MESSAGE, which tells the
 * reader to initialize a git submodule — advice that cannot help an npm
 * consumer whose only problem is an unset or expired PZG_LICENSE_KEY.
 */
export function buildProLicenseMessage(status: {
  reason?: LicenseFailureReason;
  detail?: string;
}): string {
  const lines = [status.detail || 'PZG Pro license required.', ''];

  if (status.reason === 'code_tampering_detected') {
    lines.push('Docs & support: https://github.com/omar-dulaimi/prisma-zod-generator/issues');
    return lines.join('\n');
  }

  lines.push(
    'The Pro modules are installed, so this is a licensing problem rather than a broken install.',
    status.reason === 'expired'
      ? '  1. Renew your subscription, then set the new key:'
      : '  1. Set your license key:',
    '       export PZG_LICENSE_KEY=<your key>',
    '  2. Verify it:  npx prisma-zod-generator license-check',
    '  3. Re-run `prisma generate`',
    '',
    'Docs & pricing: https://omar-dulaimi.github.io/prisma-zod-generator/pricing',
  );

  return lines.join('\n');
}

/** True when the private Pro modules resolve, regardless of license state. */
function proModulesAvailable(): boolean {
  try {
    require.resolve(['..', 'pro'].join('/'));
    return true;
  } catch {
    return false;
  }
}

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

  /**
   * Per-model settings, merged in from `configPath`. Only `enabled` is consulted
   * by the Pro packs; it uses the same shape as the core generator's config so a
   * single file governs both.
   */
  models?: Record<string, { enabled?: boolean }>;
}

export async function generateProFeatures(options: GeneratorOptions): Promise<void> {
  try {
    console.log('🚀 Starting PZG Pro Generator...');

    const licenseStatus = await getLicenseStatus();
    if (!licenseStatus.valid) {
      // Distinguish "Pro isn't installed" from "Pro is installed but unlicensed":
      // they need completely different remedies.
      if (proModulesAvailable()) {
        throw new Error(buildProLicenseMessage(licenseStatus));
      }
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

    const dmmf =
      options.dmmf ??
      (await getDMMF({
        datamodel: options.datamodel,
      }));

    console.log(
      `📋 Analyzed schema: ${dmmf.datamodel.models.length} models, ${
        dmmf.schema.enumTypes.prisma.length + (dmmf.schema.enumTypes.model?.length || 0)
      } enums`,
    );

    const config = await parseProConfig(options);
    // Resolved by parseProConfig, which owns the precedence between the generator block's `output`,
    // an explicit `outputPath`, and the default beside the schema.
    const outputPath = config.outputPath!;
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

    // Every pack filters its model loop through ProFeatureBase.getEnabledModels(),
    // which reads this. Passing an empty object here meant `models` was never
    // honoured and each pack generated for every model in the schema.
    const sharedGeneratorConfig = { models: config.models ?? {} } as GeneratorConfig;

    const excludedModels = Object.entries(config.models ?? {})
      .filter(([, modelConfig]) => modelConfig?.enabled === false)
      .map(([name]) => name);
    if (excludedModels.length > 0) {
      console.log(`🚫 Excluded models: ${excludedModels.join(', ')}`);
    }

    if (config.enablePolicies) {
      enabledFeatures.push('Policies & Redaction');
      featurePromises.push(
        features
          .generatePoliciesFromDMMF(
            dmmf,
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            sharedGeneratorConfig,
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
            // These two parse the schema themselves, so exclusion cannot reach
            // them through sharedGeneratorConfig.
            models: config.models ?? {},
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
            // These two parse the schema themselves, so exclusion cannot reach
            // them through sharedGeneratorConfig.
            models: config.models ?? {},
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
      console.log('⚠️  No features enabled, so nothing was generated.');

      // Say which of the two places was actually consulted. Reporting only "no features enabled"
      // left someone who had written their flags in the right file, under the wrong key, with
      // nothing to go on.
      if (config.configPath) {
        console.log(`\nRead config from: ${config.configPath}`);
        console.log('It contained no recognised enable* flags.');
      } else {
        console.log('\nNo config file was referenced, so only the generator block was read.');
      }

      console.log('\nFlags go in either place. In the generator block:');
      console.log('generator pzgPro {');
      console.log(
        '  provider            = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"',
      );
      console.log('  output              = "./generated/pro"');
      console.log('  enablePolicies      = true');
      console.log('  enableServerActions = true');
      console.log('}');
      console.log('\nOr in a JSON file referenced by configPath (config is accepted too):');
      console.log('generator pzgPro {');
      console.log('  provider   = "node ./node_modules/prisma-zod-generator/lib/cli/pzg-pro.js"');
      console.log('  output     = "./generated/pro"');
      console.log('  configPath = "./pzg-pro.json"');
      console.log('}');
      console.log('\n// pzg-pro.json');
      console.log('{ "enablePolicies": true, "enableServerActions": true }');
      console.log(
        `\nAvailable flags: ${['enablePolicies', 'enableServerActions', 'enableSDK', 'enableContracts', 'enablePostgresRLS', 'enableForms', 'enableApiDocs', 'enableMultiTenant', 'enablePerformance', 'enableFactories'].join(', ')}`,
      );
    }
  } catch (error) {
    // stderr is correct *here*, unlike everywhere else in this file. Prisma swallows a generator's
    // stderr on the success path — which is why every diagnostic above uses console.log — but when
    // the generator exits non-zero Prisma relays stderr as the body of the error it reports. Verified
    // against prisma generate with a probe generator: stderr appears under "Error:", stdout does not.
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

/**
 * Exported for `tests/pro-config-parsing.test.ts`. Which packs run, and where that decision is read
 * from, is worth testing directly: the `config`/`configPath` mismatch it now tolerates failed by
 * enabling nothing and saying nothing, which no end-to-end assertion on generated files would catch.
 */
export async function parseProConfig(options: GeneratorOptions): Promise<ProFeaturesConfig> {
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

  // `config` is accepted as an alias for `configPath`. The core generator reads its JSON config from
  // `config = "./zod-generator.config.json"`, so anyone who set that up writes the same key here —
  // and this used to read nothing, apply no flags, and report "No features enabled" while printing an
  // example whose flags happen to sit inline, so nothing pointed at the mismatch.
  // Where the output goes, in order of specificity.
  //
  // `output` on the generator block was ignored entirely: this read only the `outputPath` key and
  // otherwise defaulted to `<schemaDir>/generated/pro`, while Prisma printed "Generated PZG Pro
  // Generator to <block output>" — a directory that stayed empty. Anyone who set `output` got their
  // files somewhere else and a success message pointing at the wrong place. The core generator has
  // always read `options.generator.output`; this now does too.
  const blockOutput = (options.generator.output as { value?: string } | undefined)?.value;
  const explicitOutputPath = generatorConfig.outputPath;
  config.outputPath = explicitOutputPath
    ? String(explicitOutputPath)
    : (blockOutput ?? path.join(path.dirname(options.schemaPath), 'generated', 'pro'));

  const configPathValue = generatorConfig.configPath ?? generatorConfig.config;

  if (configPathValue) {
    config.configPath = String(configPathValue);

    try {
      const schemaBaseDir = path.dirname(options.schemaPath);
      const configFilePath = path.isAbsolute(config.configPath)
        ? config.configPath
        : path.resolve(schemaBaseDir, config.configPath);

      const externalConfig = JSON.parse(await fs.readFile(configFilePath, 'utf-8'));
      Object.assign(config, externalConfig);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      // stdout: Prisma does not relay a generator's stderr, so console.warn would be invisible.
      console.log(`⚠️  Failed to load PZG Pro config from "${config.configPath}": ${detail}`);
      console.log('   No feature flags were applied from it.');
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
