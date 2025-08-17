/**
 * Test helpers barrel export file
 * Provides centralized access to all test utilities and mock generators
 */

// Core test utilities
export {
  MockDMMFGenerator,
  ConfigTestUtils,
  SchemaValidationUtils,
  FileSystemUtils,
  TestAssertions,
} from './test-utils';

// Mock data generators
export {
  PrismaSchemaGenerator,
  ConfigGenerator,
  TestEnvironment,
  MockDMMF,
} from './mock-generators';

// Common test patterns and constants
export const TEST_TIMEOUT = 30000;
export const GENERATION_TIMEOUT = 180000; // Increased to 3 minutes for filtering tests

export const DEFAULT_TEST_CONFIG = {
  output: './generated/schemas',
  relationModel: true,
  modelCase: 'PascalCase',
  modelSuffix: 'Schema',
  useMultipleFiles: true,
  createInputTypes: true,
  addIncludeType: false,
  addSelectType: false,
  validateWhereUniqueInput: true,
  prismaClientPath: '@prisma/client',
};

export const COMMON_FIELD_TYPES = [
  'String',
  'Int',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
  'Decimal',
  'BigInt',
];

export const CRUD_OPERATIONS = [
  'findMany',
  'findUnique',
  'findFirst',
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
  'aggregate',
  'groupBy',
];

export const MINIMAL_OPERATIONS = ['findMany', 'findUnique', 'create', 'update', 'delete'];

/**
 * Common test setup function
 */
export async function setupTest(
  testName: string,
  options: {
    schema?: string;
    config?: Record<string, unknown>;
    timeout?: number;
  } = {},
) {
  const { TestEnvironment, PrismaSchemaGenerator, ConfigGenerator } = await import(
    './mock-generators'
  );

  const schema = options.schema || PrismaSchemaGenerator.createBasicSchema();
  const config = options.config || ConfigGenerator.createBasicConfig();

  return TestEnvironment.setupWithConfig(testName, schema, config);
}

/**
 * Common cleanup function for tests
 */
export async function cleanupTest(testEnv: { cleanup: () => Promise<void> }) {
  await testEnv.cleanup();
}
