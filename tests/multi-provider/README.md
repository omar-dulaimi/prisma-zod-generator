# Multi-Provider Test Suite

A comprehensive testing framework for validating the Prisma Zod Generator across multiple database providers (PostgreSQL, MySQL, MongoDB, SQLite, SQL Server).

## Overview

This test suite ensures that the Prisma Zod Generator produces consistent, valid Zod schemas regardless of the underlying database provider. It validates schema generation, type safety, and feature compatibility across all supported providers.

## Architecture

### Core Components

- **`multi-provider.test.ts`** - Main test suite orchestrating cross-provider validation
- **`provider-test-suite.ts`** - Framework for creating provider-specific test suites
- **`../../prisma/utils/`** - Supporting utilities for multi-provider testing

### Test Categories

1. **Provider Availability Tests** - Validates configuration for each provider
2. **Schema Generation Tests** - Ensures schemas generate successfully for each provider
3. **Cross-Provider Compatibility** - Verifies consistent schema structure across providers
4. **Performance Comparison** - Benchmarks generation speed across providers
5. **Error Handling** - Tests graceful handling of invalid configurations
6. **Feature Coverage** - Validates provider-specific features and limitations

## Supported Providers

| Provider | Features | Limitations |
|----------|----------|-------------|
| **PostgreSQL** | Full feature set, native types, arrays, JSON, enums | None |
| **MySQL** | Full feature set, native types, JSON, enums | Limited array support |
| **MongoDB** | Document-based, embedded types, raw operations | No traditional relations |
| **SQLite** | Basic types, JSON support | Limited native types |
| **SQL Server** | Full feature set, native types | Complex type mappings |

## Quick Start

### Running All Tests

```bash
# Run the multi-provider suite
pnpm test tests/multi-provider/

# Narrow to one provider's tests
pnpm test tests/multi-provider/ -t 'PostgreSQL Provider Tests'

# Narrow to generation only
pnpm test tests/multi-provider/ -t 'should generate schemas for mysql'
```

No database is required: these suites only run `prisma generate`, which reads the
schema and never connects.

## Test Structure

### Provider Test Suite Framework

Each provider gets its own comprehensive test suite covering:

```typescript
describe('PostgreSQL Provider Tests', () => {
  describe('Type Validation', () => {
    // Tests for native types, arrays, JSON, enums, composite types
  });
  
  describe('Operation Schemas', () => {
    // Tests for CRUD operations, aggregates, groupBy
  });
  
  describe('Relationship Schemas', () => {
    // Tests for one-to-one, one-to-many, many-to-many, self-referential
  });
  
  describe('Provider-Specific Features', () => {
    // Tests for provider-specific capabilities and limitations
  });
  
  describe('Performance Tests', () => {
    // Schema generation speed, validation performance, file size
  });
  
  describe('Edge Cases', () => {
    // Null handling, empty values, special characters, unicode
  });
});
```

### Cross-Provider Validation

The main test suite ensures consistency across providers:

```typescript
describe('Cross-Provider Compatibility Tests', () => {
  it('should generate consistent schemas across providers', async () => {
    // Validates that all providers generate similar operation schemas
    // Checks for common operations: Basic Types, CRUD Operations, Relationships
  });
});
```

## Configuration

### Provider Configuration

Provider configurations are defined in `../../prisma/utils/provider-config.ts`:

```typescript
interface ProviderConfig {
  name: string;
  provider: string;
  schemaPath: string;
  generatedPath: string;
  features: {
    nativeTypes: string[];
    arrays: boolean;
    json: boolean;
    enums: boolean;
    composite: boolean;
    specificFeatures: string[];
  };
  limitations: {
    unsupportedFeatures: string[];
  };
}
```

### Schema Paths

Each provider uses its own schema file:
- PostgreSQL: `tests/multi-provider/schemas/postgresql/schema.prisma`
- MySQL: `tests/multi-provider/schemas/mysql/schema.prisma`
- MongoDB: `tests/multi-provider/schemas/mongodb/schema.prisma`
- SQLite: `tests/multi-provider/schemas/sqlite/schema.prisma`
- SQL Server: `tests/multi-provider/schemas/sqlserver/schema.prisma`

## Test Execution Flow

### 1. Setup Phase
- Check prerequisites (Node.js, Prisma CLI, TypeScript, Vitest)
- Setup database connections
- Install dependencies

### 2. Generation Phase
- Generate schemas for each provider using `prisma generate`
- Validate schema generation success
- Import generated schemas for testing

### 3. Testing Phase
- Run provider-specific test suites
- Execute cross-provider compatibility tests
- Performance benchmarking
- Error handling validation

### 4. Teardown Phase
- Cleanup generated files
- Close database connections
- Generate test reports

## Performance Benchmarks

The test suite includes performance validation:

- **Generation Time**: Each provider should complete within 60 seconds
- **Validation Speed**: Schema validation should average under 1ms
- **File Size**: Generated files should be under 1MB each
- **Relative Performance**: Slowest provider should not be more than 10x slower than fastest

## Error Handling

The test suite validates graceful error handling:

- Invalid provider configurations
- Missing schema files
- Generation failures
- Type validation errors
- Provider-specific limitations

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Multi-Provider Tests
  run: pnpm test tests/multi-provider/
```

In this repository they are covered by `pnpm test`, which runs every file, so CI
needs no separate step.

## Troubleshooting

### Common Issues

1. **Schema Generation Failures**
   - Ensure all provider schema files exist
   - Check Prisma CLI version compatibility
   - Verify database connection strings

2. **Provider Configuration Errors**
   - Validate provider config in `provider-config.ts`
   - Check schema paths are correct
   - Ensure generated paths exist

3. **Performance Issues**
   - Use `--parallel` flag for faster execution
   - Check system resources during parallel runs
   - Review provider-specific performance characteristics

4. **Type Safety Issues**
   - Ensure TypeScript compilation succeeds
   - Check generated schema imports
   - Validate Zod schema structure

### Debug Mode

Run tests with verbose output:

```bash
pnpm test tests/multi-provider/ --reporter=verbose
```

## Best Practices

1. **Test All Providers**: Ensure comprehensive coverage across all supported databases
2. **Validate Consistency**: Cross-provider tests ensure uniform behavior
3. **Performance Monitoring**: Regular benchmarking prevents regression
4. **Error Handling**: Test graceful failure scenarios
5. **Feature Coverage**: Validate provider-specific capabilities and limitations

## Contributing

When adding new providers or features:

1. Update `provider-config.ts` with new provider configuration
2. Create provider-specific schema file
3. Add provider to test suite creation
4. Update this README with new provider information
5. Run full multi-provider test suite to validate changes

This comprehensive test suite ensures the Prisma Zod Generator maintains high quality and consistency across all supported database providers.