# Prisma Zod Generator Test Suite

A comprehensive testing framework for validating generated Zod schemas with TypeScript type safety.

## Quick Start

```bash
# Install dependencies
cd tests
npm install

# Run all tests
npm run test:full

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run automated test runner
npx ts-node automated-test-runner.ts
```

## Test Structure

### Core Components

1. **`schema-test-utils.ts`** - Comprehensive utility functions for schema testing
2. **`generated-schema.test.ts`** - Example test cases for generated schemas
3. **`automated-test-runner.ts`** - Automated test discovery and execution
4. **`setup.ts`** - Global test setup and custom Jest matchers

### Test Categories

- **Operation Schemas**: `findFirst`, `findMany`, `create`, `update`, `delete`
- **Enum Schemas**: Field enums, sort orders, etc.
- **Object Schemas**: Input types, filter types, relation types
- **Type Safety**: TypeScript type inference validation
- **Performance**: Validation speed benchmarks

## SchemaTestUtils API

### Basic Validation

```typescript
import { SchemaTestUtils } from './schema-test-utils';

// Test valid data
SchemaTestUtils.testValidData(schema, validData, expectedOutput);

// Test invalid data
SchemaTestUtils.testInvalidData(schema, invalidData, expectedErrorPaths);

// Test TypeScript type inference
SchemaTestUtils.testTypeInference(schema);
```

### Advanced Testing

```typescript
// Test optional fields
SchemaTestUtils.testOptionalFields(schema, baseData, optionalFields);

// Test required fields
SchemaTestUtils.testRequiredFields(schema, baseData, requiredFields);

// Test boundary values
SchemaTestUtils.testBoundaryValues(schema, testCases);

// Test enum values
SchemaTestUtils.testEnumValues(schema, validValues, invalidValues);

// Performance testing
SchemaTestUtils.performanceTest(schema, testData, iterations);
```

## Custom Jest Matchers

```typescript
// Test schema validation
expect(schema).toBeValidZodSchema(testData);

// Test schema errors
expect(schema).toHaveZodError(invalidData, ['field.path']);
```

## Test Data Generators

```typescript
import { TestDataGenerators } from './schema-test-utils';

// Use predefined test data
const validStrings = TestDataGenerators.string.valid;
const invalidNumbers = TestDataGenerators.number.invalid;

// Generate custom objects
const testUser = TestDataGenerators.generateObject(
  { email: 'test@example.com', name: 'Test User' },
  { id: 123 }
);
```

## Automated Test Runner

The automated test runner provides comprehensive validation:

```bash
# Run full test suite
npx ts-node automated-test-runner.ts

# Run specific test pattern
npx ts-node automated-test-runner.ts specific "UserSchema"

# Run performance benchmark
npx ts-node automated-test-runner.ts performance
```

### Features

- **TypeScript Compilation Check**: Validates all types compile correctly
- **Schema Discovery**: Automatically finds all generated schemas
- **Validation Testing**: Tests schema loading and basic validation
- **Performance Benchmarking**: Measures validation speed
- **Comprehensive Reporting**: Detailed test results and timing

## Writing Tests

### Basic Schema Test

```typescript
import { SchemaTestUtils } from './schema-test-utils';
import { UserCreateSchema } from '../prisma/generated/schemas/createOneUser.schema';

describe('UserCreateSchema', () => {
  it('should validate with required fields', () => {
    const validData = {
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    SchemaTestUtils.testValidData(UserCreateSchema, validData);
  });

  it('should reject missing required fields', () => {
    const invalidData = {
      data: {
        name: 'Test User'
        // missing email
      }
    };

    SchemaTestUtils.testInvalidData(UserCreateSchema, invalidData, ['data.email']);
  });
});
```

### Type Safety Test

```typescript
it('should have correct TypeScript types', () => {
  SchemaTestUtils.testTypeInference(UserCreateSchema);
  
  // Test specific type structure
  type Expected = {
    data: {
      email: string;
      name: string;
      posts?: { create: Array<{ title: string }> };
    };
  };

  const typeCheck = (value: Expected): value is Expected => true;
  SchemaTestUtils.testTypeInference(UserCreateSchema, typeCheck);
});
```

### Performance Test

```typescript
it('should validate efficiently', () => {
  const testData = { data: { email: 'test@example.com', name: 'Test' } };
  const performance = SchemaTestUtils.performanceTest(UserCreateSchema, testData, 1000);
  
  expect(performance.avgTime).toBeLessThan(1); // < 1ms average
});
```

## Configuration

### Jest Configuration

The `jest.config.js` provides:
- TypeScript support via `ts-jest`
- Coverage reporting
- Custom test patterns
- Performance monitoring

### TypeScript Configuration

The `tsconfig.test.json` extends the main project config with:
- Test-specific compiler options
- Include paths for generated schemas
- Jest type definitions

## Best Practices

1. **Test All Schema Types**: Operations, enums, objects
2. **Validate Type Safety**: Use `testTypeInference` for TypeScript validation
3. **Test Edge Cases**: Boundary values, optional fields, nested objects
4. **Performance Testing**: Ensure schemas validate efficiently
5. **Comprehensive Coverage**: Test both valid and invalid data paths

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Test Generated Schemas
  run: |
    cd tests
    npm install
    npm run test:ci
    npx ts-node automated-test-runner.ts
```

This ensures all generated schemas are validated before deployment.

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure schema paths are correct in test files
2. **Type Errors**: Check that generated schemas have proper TypeScript types
3. **Performance Issues**: Use `performanceTest` to identify slow schemas
4. **Missing Schemas**: Run `npm run gen-example` to regenerate schemas

### Debug Mode

Run tests with additional logging:

```bash
npm test -- --verbose
NODE_ENV=test npm test
```

This comprehensive test suite ensures your generated Zod schemas are reliable, type-safe, and performant.