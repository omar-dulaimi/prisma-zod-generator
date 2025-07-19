# Multi-Provider Testing Framework

This directory contains a comprehensive testing framework for validating the Prisma Zod Generator across all supported database providers.

## Overview

The multi-provider testing framework ensures that the Prisma Zod Generator works correctly with:
- **PostgreSQL** - Full PostgreSQL native types and features
- **MySQL** - MySQL-specific types and spatial features
- **MongoDB** - Document modeling and embedded documents
- **SQLite** - SQLite type affinity and limitations
- **SQL Server** - SQL Server native types and features

## Architecture

```
tests/multi-provider/
├── provider-test-suite.ts      # Test suite framework
├── multi-provider.test.ts      # Integration tests
├── run-all-tests.ts           # Test runner script
└── README.md                  # This file

prisma/
├── schemas/                   # Provider-specific schemas
│   ├── postgresql/
│   │   ├── schema.prisma      # PostgreSQL test schema
│   │   └── generated/         # Generated Zod schemas
│   ├── mysql/
│   │   ├── schema.prisma      # MySQL test schema
│   │   └── generated/         # Generated Zod schemas
│   ├── mongodb/
│   │   ├── schema.prisma      # MongoDB test schema
│   │   └── generated/         # Generated Zod schemas
│   ├── sqlite/
│   │   ├── schema.prisma      # SQLite test schema
│   │   └── generated/         # Generated Zod schemas
│   └── sqlserver/
│       ├── schema.prisma      # SQL Server test schema
│       └── generated/         # Generated Zod schemas
└── utils/
    ├── provider-config.ts     # Provider configurations
    └── multi-provider-test-runner.ts  # Test execution engine
```

## Features Tested

### Core Features (All Providers)
- ✅ Basic scalar types (String, Int, Float, Boolean, DateTime, Json, Bytes, BigInt)
- ✅ CRUD operations (findMany, findFirst, create, update, delete, etc.)
- ✅ Aggregation operations (count, sum, avg, min, max)
- ✅ Relationships (one-to-one, one-to-many, many-to-many)
- ✅ Enums and optional fields
- ✅ Null handling and validation

### Provider-Specific Features

#### PostgreSQL
- ✅ All native types (VarChar, Text, Json, JsonB, Uuid, Inet, etc.)
- ✅ Arrays of scalars
- ✅ Custom types and enums
- ✅ Full-text search
- ✅ Network types (Inet, Cidr, Macaddr)
- ✅ Advanced date/time types
- ✅ Geometric types
- ✅ Range types

#### MySQL
- ✅ All integer types (signed/unsigned)
- ✅ Spatial data types (Point, LineString, Polygon, etc.)
- ✅ AUTO_INCREMENT functionality
- ✅ ZEROFILL and UNSIGNED attributes
- ✅ JSON functions
- ✅ Full-text search
- ✅ Generated columns

#### MongoDB
- ✅ Document modeling
- ✅ Embedded documents (composite types)
- ✅ Arrays of documents
- ✅ ObjectId handling
- ✅ Geospatial data
- ✅ Aggregation pipelines
- ✅ Raw operations (findRaw, aggregateRaw)

#### SQLite
- ✅ Type affinity system
- ✅ JSON1 extension
- ✅ FTS (Full-Text Search)
- ✅ Limitation handling
- ✅ Workarounds for missing features

#### SQL Server
- ✅ All native types (TinyInt, SmallInt, Money, etc.)
- ✅ Unicode types (NChar, NVarChar, NText)
- ✅ Spatial types (Geometry, Geography)
- ✅ UniqueIdentifier (GUID)
- ✅ XML data type
- ✅ Identity columns
- ✅ Computed columns

## Running Tests

### All Providers
```bash
# Run all tests for all providers
npm run test:multi-provider

# Run tests in parallel (faster)
npm run test:multi-provider:parallel

# Generate schemas only
npm run test:multi-provider:generate

# Run comprehensive test suite
npm run test:comprehensive
```

### Specific Providers
```bash
# Test PostgreSQL only
npm run test:multi-provider:postgresql

# Test MySQL only
npm run test:multi-provider:mysql

# Test MongoDB only
npm run test:multi-provider:mongodb

# Test SQLite only
npm run test:multi-provider:sqlite

# Test SQL Server only
npm run test:multi-provider:sqlserver
```

### Custom Options
```bash
# Run specific providers
npm run test:multi-provider -- --providers postgresql,mysql

# Verbose output
npm run test:multi-provider -- --verbose

# JSON output for CI/CD
npm run test:multi-provider:json

# Skip setup phase
npm run test:multi-provider -- --skip-setup

# Test only (no generation)
npm run test:multi-provider -- --test-only
```

## Test Categories

### 1. Type Validation Tests
- Validates that all native database types generate correct Zod schemas
- Tests boundary values and edge cases
- Verifies type coercion works properly

### 2. Operation Schema Tests
- Tests all CRUD operations generate valid schemas
- Verifies aggregation operations work correctly
- Tests complex query operations

### 3. Relationship Tests
- One-to-one relationships
- One-to-many relationships
- Many-to-many relationships
- Self-referential relationships
- Embedded relationships (MongoDB)

### 4. Provider-Specific Tests
- Database-specific features
- Provider limitations
- Error handling for unsupported features

### 5. Performance Tests
- Schema generation speed
- Validation performance
- Memory usage
- File size optimization

### 6. Edge Case Tests
- Null/undefined handling
- Empty arrays and objects
- Large values
- Special characters
- Unicode support

## Test Report Format

The test runner generates comprehensive reports:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.8.13",
  "providers": ["postgresql", "mysql", "mongodb", "sqlite", "sqlserver"],
  "testSuites": [
    {
      "name": "postgresql",
      "description": "Test suite for PostgreSQL",
      "results": [...],
      "summary": {
        "totalTests": 45,
        "passedTests": 43,
        "failedTests": 2,
        "skippedTests": 0,
        "totalDuration": 1250,
        "coverage": 95.56
      }
    }
  ],
  "overallSummary": {
    "totalTests": 225,
    "passedTests": 215,
    "failedTests": 10,
    "skippedTests": 0,
    "totalDuration": 6250,
    "coverage": 95.56
  },
  "performanceMetrics": {
    "generationTime": {
      "postgresql": 1200,
      "mysql": 1100,
      "mongodb": 800,
      "sqlite": 500,
      "sqlserver": 1400
    },
    "schemaValidationTime": {...},
    "memoryUsage": {...},
    "fileSize": {...}
  }
}
```

## Environment Setup

### Prerequisites
- Node.js 18+
- TypeScript 5+
- Prisma CLI
- Database connections (optional for full testing)

### Environment Variables
```bash
# PostgreSQL
POSTGRESQL_URL="postgresql://user:password@localhost:5432/test"

# MySQL
MYSQL_URL="mysql://user:password@localhost:3306/test"

# MongoDB
MONGODB_URL="mongodb://localhost:27017/test"

# SQLite (file-based)
SQLITE_URL="file:./test.db"

# SQL Server
SQLSERVER_URL="sqlserver://localhost:1433;database=test;user=sa;password=password"
```

### Docker Setup (Optional)
```bash
# Start all databases with Docker Compose
docker-compose up -d

# Or start individual databases
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password mysql:8.0
docker run -d --name mongodb -p 27017:27017 mongo:7.0
docker run -d --name sqlserver -p 1433:1433 -e SA_PASSWORD=Password123 mcr.microsoft.com/mssql/server:2022-latest
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Multi-Provider Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        ports:
          - 5432:5432
      
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
        ports:
          - 3306:3306
      
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
          
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - run: npm ci
      - run: npm run test:multi-provider:parallel
        env:
          POSTGRESQL_URL: postgresql://postgres:password@localhost:5432/test
          MYSQL_URL: mysql://root:password@localhost:3306/test
          MONGODB_URL: mongodb://localhost:27017/test
          SQLITE_URL: file:./test.db
```

## Contributing

### Adding New Providers
1. Create schema in `prisma/schemas/{provider}/schema.prisma`
2. Add provider configuration in `prisma/utils/provider-config.ts`
3. Update test suites to include new provider
4. Add provider-specific tests for unique features

### Adding New Tests
1. Add test cases to appropriate provider configuration
2. Implement test logic in `provider-test-suite.ts`
3. Update documentation

### Performance Benchmarks
- PostgreSQL: ~1200ms generation time
- MySQL: ~1100ms generation time
- MongoDB: ~800ms generation time
- SQLite: ~500ms generation time
- SQL Server: ~1400ms generation time

## Troubleshooting

### Common Issues

1. **Schema Generation Fails**
   - Check that schema files exist
   - Verify Prisma CLI is installed
   - Ensure database connections are valid

2. **Test Timeouts**
   - Increase timeout values in test configuration
   - Use `--parallel` flag for faster execution
   - Check database connectivity

3. **Memory Issues**
   - Reduce test parallelism
   - Increase Node.js memory limit: `--max-old-space-size=4096`

4. **Provider Not Found**
   - Check provider configuration in `provider-config.ts`
   - Verify schema files exist
   - Ensure provider is in the supported list

### Debug Mode
```bash
# Enable verbose logging
npm run test:multi-provider -- --verbose

# Generate only for debugging
npm run test:multi-provider:generate -- --verbose

# Test single provider with debug output
npm run test:multi-provider:postgresql -- --verbose
```

## Future Enhancements

- [ ] Visual diff reporting for schema changes
- [ ] Integration with schema registries
- [ ] Performance regression testing
- [ ] Automated provider feature detection
- [ ] Real-time database testing
- [ ] Schema evolution testing
- [ ] Load testing with large schemas
- [ ] Cross-version compatibility testing

## License

This testing framework is part of the Prisma Zod Generator project and is licensed under the MIT License.