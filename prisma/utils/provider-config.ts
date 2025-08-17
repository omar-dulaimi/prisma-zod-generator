// Multi-Provider Test Configuration
// Manages database providers and their specific configurations

export interface ProviderConfig {
  name: string;
  provider: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'sqlserver';
  schemaPath: string;
  generatedPath: string;
  connectionString: string;
  features: ProviderFeatures;
  limitations: ProviderLimitations;
  testCategories: TestCategory[];
}

export interface ProviderFeatures {
  // Native data types
  nativeTypes: string[];

  // Advanced features
  arrays: boolean;
  json: boolean;
  fullTextSearch: boolean;
  spatial: boolean;
  enums: boolean;
  composite: boolean;

  // Database-specific features
  specificFeatures: string[];
}

export interface ProviderLimitations {
  // Known limitations
  maxStringLength?: number;
  maxArraySize?: number;
  maxIndexes?: number;
  maxRelations?: number;

  // Unsupported features
  unsupportedFeatures: string[];

  // Workarounds
  workarounds: Record<string, string>;
}

export interface TestCategory {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  testCases: TestCase[];
}

export interface TestCase {
  name: string;
  description: string;
  schemaElements: string[];
  expectedSchemas: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  expectedResult: 'pass' | 'fail';
  errorMessage?: string;
}

// Provider configurations
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  postgresql: {
    name: 'PostgreSQL',
    provider: 'postgresql',
    schemaPath: 'prisma/schemas/postgresql/schema.prisma',
    generatedPath: 'prisma/schemas/postgresql/generated',
    connectionString:
      process.env.POSTGRESQL_URL || 'postgresql://user:password@localhost:5432/test',
    features: {
      nativeTypes: [
        'VarChar',
        'Char',
        'Text',
        'Json',
        'JsonB',
        'Uuid',
        'Inet',
        'Cidr',
        'Macaddr',
        'Date',
        'Time',
        'Timestamp',
        'Timestamptz',
        'Timetz',
        'Interval',
        'SmallInt',
        'Integer',
        'BigInt',
        'Real',
        'DoublePrecision',
        'Decimal',
        'Numeric',
        'Money',
        'Serial',
        'BigSerial',
        'SmallSerial',
        'Bit',
        'VarBit',
        'ByteA',
        'Boolean',
        'Xml',
        'Oid',
      ],
      arrays: true,
      json: true,
      fullTextSearch: true,
      spatial: true,
      enums: true,
      composite: true,
      specificFeatures: [
        'arrays',
        'jsonb',
        'uuid',
        'network_types',
        'full_text_search',
        'inheritance',
        'custom_types',
        'range_types',
        'geometric_types',
        'extensions',
        'multi_schema',
      ],
    },
    limitations: {
      maxStringLength: 1073741824, // 1GB
      maxArraySize: 1073741824,
      maxIndexes: 64,
      maxRelations: undefined,
      unsupportedFeatures: [],
      workarounds: {},
    },
    testCategories: [
      {
        name: 'Native Types',
        description: 'Test all PostgreSQL native data types',
        priority: 'high',
        testCases: [
          {
            name: 'Text Types',
            description: 'Test VarChar, Char, Text types',
            schemaElements: [
              'PostgreSQLAllTypes.varcharField',
              'PostgreSQLAllTypes.charField',
              'PostgreSQLAllTypes.textField',
            ],
            expectedSchemas: ['z.string()', 'z.string()', 'z.string()'],
            validationRules: [
              { field: 'varcharField', rule: 'maxLength', expectedResult: 'pass' },
              { field: 'charField', rule: 'exactLength', expectedResult: 'pass' },
              { field: 'textField', rule: 'string', expectedResult: 'pass' },
            ],
          },
        ],
      },
    ],
  },

  mysql: {
    name: 'MySQL',
    provider: 'mysql',
    schemaPath: 'prisma/schemas/mysql/schema.prisma',
    generatedPath: 'prisma/schemas/mysql/generated',
    connectionString: process.env.MYSQL_URL || 'mysql://user:password@localhost:3306/test',
    features: {
      nativeTypes: [
        'TinyInt',
        'SmallInt',
        'MediumInt',
        'Int',
        'BigInt',
        'UnsignedTinyInt',
        'UnsignedSmallInt',
        'UnsignedMediumInt',
        'UnsignedInt',
        'UnsignedBigInt',
        'Float',
        'Double',
        'Decimal',
        'Char',
        'VarChar',
        'TinyText',
        'Text',
        'MediumText',
        'LongText',
        'Binary',
        'VarBinary',
        'TinyBlob',
        'Blob',
        'MediumBlob',
        'LongBlob',
        'Date',
        'Time',
        'DateTime',
        'Timestamp',
        'Year',
        'Json',
        'Bit',
        'Geometry',
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiLineString',
        'MultiPolygon',
        'GeometryCollection',
      ],
      arrays: false,
      json: true,
      fullTextSearch: true,
      spatial: true,
      enums: true,
      composite: false,
      specificFeatures: [
        'unsigned_integers',
        'auto_increment',
        'zerofill',
        'spatial_types',
        'json_functions',
        'generated_columns',
        'partitioning',
        'fulltext_indexes',
        'spatial_indexes',
      ],
    },
    limitations: {
      maxStringLength: 4294967295, // 4GB
      maxArraySize: undefined,
      maxIndexes: 64,
      maxRelations: undefined,
      unsupportedFeatures: ['arrays', 'composite_types'],
      workarounds: {
        arrays: 'Use JSON or separate junction tables',
        composite_types: 'Use JSON or separate related tables',
      },
    },
    testCategories: [
      {
        name: 'Integer Types',
        description: 'Test all MySQL integer types including unsigned variants',
        priority: 'high',
        testCases: [
          {
            name: 'Signed Integers',
            description: 'Test TinyInt, SmallInt, MediumInt, Int, BigInt',
            schemaElements: [
              'MySQLAllTypes.tinyintField',
              'MySQLAllTypes.smallintField',
              'MySQLAllTypes.intField',
            ],
            expectedSchemas: ['z.number().int()', 'z.number().int()', 'z.number().int()'],
            validationRules: [
              { field: 'tinyintField', rule: 'int', expectedResult: 'pass' },
              { field: 'smallintField', rule: 'int', expectedResult: 'pass' },
              { field: 'intField', rule: 'int', expectedResult: 'pass' },
            ],
          },
        ],
      },
    ],
  },

  mongodb: {
    name: 'MongoDB',
    provider: 'mongodb',
    schemaPath: 'prisma/schemas/mongodb/schema.prisma',
    generatedPath: 'prisma/schemas/mongodb/generated',
    connectionString: process.env.MONGODB_URL || 'mongodb://localhost:27017/test',
    features: {
      nativeTypes: ['ObjectId'],
      arrays: true,
      json: true,
      fullTextSearch: true,
      spatial: true,
      enums: true,
      composite: true,
      specificFeatures: [
        'document_modeling',
        'embedded_documents',
        'arrays_of_documents',
        'geojson',
        'aggregation_pipelines',
        'raw_operations',
        'text_search',
        'gridfs',
      ],
    },
    limitations: {
      maxStringLength: 16777216, // 16MB
      maxArraySize: undefined,
      maxIndexes: 64,
      maxRelations: undefined,
      unsupportedFeatures: ['joins', 'foreign_keys', 'transactions_across_collections'],
      workarounds: {
        joins: 'Use $lookup aggregation or embed documents',
        foreign_keys: 'Use application-level references',
        transactions: 'Use single-document transactions or replica sets',
      },
    },
    testCategories: [
      {
        name: 'Document Modeling',
        description: 'Test MongoDB document and embedded document features',
        priority: 'high',
        testCases: [
          {
            name: 'Embedded Documents',
            description: 'Test composite types and embedded documents',
            schemaElements: ['MongoUser.profile', 'MongoUser.settings', 'MongoUser.addresses'],
            expectedSchemas: ['z.object()', 'z.object()', 'z.array()'],
            validationRules: [
              { field: 'profile', rule: 'object', expectedResult: 'pass' },
              { field: 'settings', rule: 'object', expectedResult: 'pass' },
              { field: 'addresses', rule: 'array', expectedResult: 'pass' },
            ],
          },
        ],
      },
    ],
  },

  sqlite: {
    name: 'SQLite',
    provider: 'sqlite',
    schemaPath: 'prisma/schemas/sqlite/schema.prisma',
    generatedPath: 'prisma/schemas/sqlite/generated',
    connectionString: process.env.SQLITE_URL || 'file:./test.db',
    features: {
      nativeTypes: ['Integer', 'Real', 'Text', 'Blob'],
      arrays: false,
      json: true,
      fullTextSearch: true,
      spatial: false,
      enums: true,
      composite: false,
      specificFeatures: [
        'type_affinity',
        'json1_extension',
        'fts',
        'rtree',
        'pragmas',
        'attached_databases',
      ],
    },
    limitations: {
      maxStringLength: 1000000000, // 1GB
      maxArraySize: undefined,
      maxIndexes: undefined,
      maxRelations: undefined,
      unsupportedFeatures: [
        'arrays',
        'composite_types',
        'native_boolean',
        'native_datetime',
        'stored_procedures',
        'user_defined_functions',
        'triggers_on_system_tables',
        'alter_table_limitations',
      ],
      workarounds: {
        arrays: 'Use JSON or separate tables',
        composite_types: 'Use JSON or separate tables',
        native_boolean: 'Use INTEGER (0/1)',
        native_datetime: 'Use TEXT, REAL, or INTEGER',
        stored_procedures: 'Use application logic',
      },
    },
    testCategories: [
      {
        name: 'Type Affinity',
        description: 'Test SQLite type affinity system',
        priority: 'high',
        testCases: [
          {
            name: 'Affinity Types',
            description: 'Test INTEGER, REAL, TEXT, BLOB affinities',
            schemaElements: [
              'SQLiteAllTypes.integerField',
              'SQLiteAllTypes.realField',
              'SQLiteAllTypes.textField',
              'SQLiteAllTypes.blobField',
            ],
            expectedSchemas: [
              'z.number().int()',
              'z.number()',
              'z.string()',
              'z.instanceof(Uint8Array)',
            ],
            validationRules: [
              { field: 'integerField', rule: 'int', expectedResult: 'pass' },
              { field: 'realField', rule: 'number', expectedResult: 'pass' },
              { field: 'textField', rule: 'string', expectedResult: 'pass' },
              { field: 'blobField', rule: 'bytes', expectedResult: 'pass' },
            ],
          },
        ],
      },
    ],
  },

  sqlserver: {
    name: 'SQL Server',
    provider: 'sqlserver',
    schemaPath: 'prisma/schemas/sqlserver/schema.prisma',
    generatedPath: 'prisma/schemas/sqlserver/generated',
    connectionString:
      process.env.SQLSERVER_URL ||
      'sqlserver://localhost:1433;database=test;user=sa;password=password;encrypt=true;trustServerCertificate=true',
    features: {
      nativeTypes: [
        'TinyInt',
        'SmallInt',
        'Int',
        'BigInt',
        'Decimal',
        'Numeric',
        'SmallMoney',
        'Money',
        'Float',
        'Real',
        'Char',
        'VarChar',
        'Text',
        'NChar',
        'NVarChar',
        'NText',
        'Binary',
        'VarBinary',
        'Image',
        'Date',
        'Time',
        'DateTime2',
        'DateTime',
        'SmallDateTime',
        'DateTimeOffset',
        'Timestamp',
        'Bit',
        'UniqueIdentifier',
        'Xml',
        'Geometry',
        'Geography',
      ],
      arrays: false,
      json: true,
      fullTextSearch: true,
      spatial: true,
      enums: true,
      composite: false,
      specificFeatures: [
        'identity_columns',
        'computed_columns',
        'spatial_types',
        'hierarchyid',
        'sequences',
        'synonyms',
        'cte',
        'window_functions',
        'json_functions',
        'columnstore_indexes',
        'partitioning',
        'schemas',
      ],
    },
    limitations: {
      maxStringLength: 2147483647, // 2GB
      maxArraySize: undefined,
      maxIndexes: 999,
      maxRelations: undefined,
      unsupportedFeatures: ['arrays', 'composite_types'],
      workarounds: {
        arrays: 'Use JSON or separate tables',
        composite_types: 'Use JSON or separate tables',
      },
    },
    testCategories: [
      {
        name: 'Native Types',
        description: 'Test all SQL Server native data types',
        priority: 'high',
        testCases: [
          {
            name: 'Character Types',
            description: 'Test Char, VarChar, NChar, NVarChar, Text, NText',
            schemaElements: [
              'SQLServerAllTypes.charField',
              'SQLServerAllTypes.varcharField',
              'SQLServerAllTypes.ncharField',
            ],
            expectedSchemas: ['z.string()', 'z.string()', 'z.string()'],
            validationRules: [
              { field: 'charField', rule: 'string', expectedResult: 'pass' },
              { field: 'varcharField', rule: 'string', expectedResult: 'pass' },
              { field: 'ncharField', rule: 'string', expectedResult: 'pass' },
            ],
          },
        ],
      },
    ],
  },
};

// Utility functions
export function getProviderConfig(providerName: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerName];
}

export function getAllProviders(): string[] {
  return Object.keys(PROVIDER_CONFIGS);
}

export function getProvidersByFeature(feature: keyof ProviderFeatures): string[] {
  return Object.entries(PROVIDER_CONFIGS)
    .filter(([_, config]) => config.features[feature])
    .map(([name, _]) => name);
}

export function getProvidersWithLimitation(limitation: string): string[] {
  return Object.entries(PROVIDER_CONFIGS)
    .filter(([_, config]) => config.limitations.unsupportedFeatures.includes(limitation))
    .map(([name, _]) => name);
}

export function getTestCasesForProvider(providerName: string): TestCase[] {
  const config = getProviderConfig(providerName);
  if (!config) return [];

  return config.testCategories.flatMap((category) => category.testCases);
}

export function getHighPriorityTestsForProvider(providerName: string): TestCase[] {
  const config = getProviderConfig(providerName);
  if (!config) return [];

  return config.testCategories
    .filter((category) => category.priority === 'high')
    .flatMap((category) => category.testCases);
}
