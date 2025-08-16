/**
 * Comprehensive test file to validate generated CRUD schemas against Prisma client expectations
 * This test identifies missing operations and incomplete schemas across all providers
 * 
 * Run with: node test-comprehensive-crud-validation.js
 * 
 * Critical Issues Found:
 * 1. Missing operations: findFirstOrThrow, findUniqueOrThrow, createManyAndReturn, updateManyAndReturn
 * 2. Incomplete groupBy schemas: missing _count, _min, _max aggregation fields
 * 3. Provider-specific issues with complex data types
 */

const fs = require('fs');
const path = require('path');

// Test configuration for different providers
const TEST_PROVIDERS = [
  {
    name: 'SQLite',
    schemaPath: './prisma/schema.prisma',
    generatedPath: './prisma/generated/schemas',
    models: ['User', 'Post']
  },
  {
    name: 'MySQL', 
    schemaPath: './test-schemas/mysql-comprehensive.prisma',
    generatedPath: './test-schemas/generated/mysql/schemas',
    models: ['User', 'Post', 'Profile', 'Category', 'Tag']
  },
  {
    name: 'PostgreSQL',
    schemaPath: './test-schemas/postgresql-comprehensive.prisma', 
    generatedPath: './test-schemas/generated/postgresql/schemas',
    models: ['User', 'Post', 'Profile', 'Category', 'Tag', 'Comment']
  },
  {
    name: 'MongoDB',
    schemaPath: './test-schemas/mongodb-comprehensive.prisma',
    generatedPath: './test-schemas/generated/mongodb/schemas', 
    models: ['User', 'Post', 'Profile', 'Category', 'Comment']
  },
  {
    name: 'SQL Server',
    schemaPath: './test-schemas/sqlserver-comprehensive.prisma',
    generatedPath: './test-schemas/generated/sqlserver/schemas',
    models: ['User', 'Post', 'Profile', 'Category']
  }
];

// Expected CRUD operations that should be generated
const EXPECTED_OPERATIONS = [
  'findUnique',
  'findUniqueOrThrow', // MISSING
  'findFirst', 
  'findFirstOrThrow', // MISSING
  'findMany',
  'create',
  'createMany',
  'createManyAndReturn', // MISSING
  'update',
  'updateMany',
  'updateManyAndReturn', // MISSING
  'upsert',
  'delete',
  'deleteMany',
  'aggregate',
  'groupBy',
  'count'
];

// Expected groupBy schema fields (currently missing _count, _min, _max)
const EXPECTED_GROUP_BY_FIELDS = [
  'where', // ✓ Present
  'orderBy', // ✓ Present
  'by', // ✓ Present
  'having', // ✓ Present
  'take', // ✓ Present
  'skip', // ✓ Present
  '_count', // ❌ MISSING
  '_min', // ❌ MISSING
  '_max' // ❌ MISSING
];

class CrudValidationTest {
  constructor() {
    this.results = {
      providers: {},
      summary: {
        totalIssues: 0,
        missingOperations: [],
        incompleteSchemas: [],
        providerSpecificIssues: []
      }
    };
  }

  /**
   * Main test runner
   */
  async runTests() {
    console.log('🔍 Starting Comprehensive CRUD Schema Validation\\n');
    
    for (const provider of TEST_PROVIDERS) {
      console.log(`\\n📊 Testing ${provider.name} Provider`);
      console.log('='.repeat(50));
      
      this.results.providers[provider.name] = await this.testProvider(provider);
    }
    
    this.generateSummary();
    this.printResults();
    
    return this.results;
  }

  /**
   * Test a specific provider configuration
   */
  async testProvider(provider) {
    const results = {
      name: provider.name,
      issues: [],
      missingOperations: [],
      incompleteSchemas: [],
      models: {}
    };

    // Check if generated directory exists
    if (!fs.existsSync(provider.generatedPath)) {
      results.issues.push(`Generated schema directory does not exist: ${provider.generatedPath}`);
      return results;
    }

    // Test each model
    for (const model of provider.models) {
      console.log(`  Testing ${model} model...`);
      results.models[model] = await this.testModel(model, provider.generatedPath);
      
      // Collect issues
      results.missingOperations.push(...results.models[model].missingOperations);
      results.incompleteSchemas.push(...results.models[model].incompleteSchemas);
      results.issues.push(...results.models[model].issues);
    }

    return results;
  }

  /**
   * Test operations for a specific model
   */
  async testModel(modelName, generatedPath) {
    const results = {
      model: modelName,
      missingOperations: [],
      incompleteSchemas: [],
      issues: []
    };

    // Test standard CRUD operations
    for (const operation of EXPECTED_OPERATIONS) {
      const schemaFiles = this.getOperationSchemaFiles(operation, modelName);
      
      for (const schemaFile of schemaFiles) {
        const filePath = path.join(generatedPath, schemaFile);
        
        if (!fs.existsSync(filePath)) {
          results.missingOperations.push({
            operation,
            model: modelName,
            expectedFile: schemaFile,
            status: 'MISSING'
          });
          console.log(`    ❌ Missing: ${schemaFile}`);
        } else {
          console.log(`    ✅ Found: ${schemaFile}`);
          
          // Special validation for groupBy
          if (operation === 'groupBy') {
            const groupByIssues = this.validateGroupBySchema(filePath, modelName);
            if (groupByIssues.length > 0) {
              results.incompleteSchemas.push(...groupByIssues);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Get expected schema file names for an operation
   */
  getOperationSchemaFiles(operation, modelName) {
    const modelLower = modelName.toLowerCase();
    
    const operationMap = {
      'findUnique': [`findUnique${modelName}.schema.ts`],
      'findUniqueOrThrow': [`findUniqueOrThrow${modelName}.schema.ts`], // Expected but missing
      'findFirst': [`findFirst${modelName}.schema.ts`],
      'findFirstOrThrow': [`findFirstOrThrow${modelName}.schema.ts`], // Expected but missing
      'findMany': [`findMany${modelName}.schema.ts`],
      'create': [`createOne${modelName}.schema.ts`],
      'createMany': [`createMany${modelName}.schema.ts`],
      'createManyAndReturn': [`createManyAndReturn${modelName}.schema.ts`], // Expected but missing
      'update': [`updateOne${modelName}.schema.ts`],
      'updateMany': [`updateMany${modelName}.schema.ts`],
      'updateManyAndReturn': [`updateManyAndReturn${modelName}.schema.ts`], // Expected but missing
      'upsert': [`upsertOne${modelName}.schema.ts`],
      'delete': [`deleteOne${modelName}.schema.ts`],
      'deleteMany': [`deleteMany${modelName}.schema.ts`],
      'aggregate': [`aggregate${modelName}.schema.ts`],
      'groupBy': [`groupBy${modelName}.schema.ts`],
      'count': [] // Count is usually part of aggregate
    };

    return operationMap[operation] || [];
  }

  /**
   * Validate groupBy schema completeness
   */
  validateGroupBySchema(filePath, modelName) {
    const issues = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for missing aggregation fields
      const missingFields = [];
      
      if (!content.includes('_count')) {
        missingFields.push('_count');
      }
      if (!content.includes('_min')) {
        missingFields.push('_min');
      }
      if (!content.includes('_max')) {
        missingFields.push('_max');
      }
      
      if (missingFields.length > 0) {
        issues.push({
          type: 'INCOMPLETE_GROUP_BY',
          model: modelName,
          file: path.basename(filePath),
          missingFields,
          description: `GroupBy schema missing aggregation fields: ${missingFields.join(', ')}`
        });
        
        console.log(`    ⚠️  GroupBy incomplete: missing ${missingFields.join(', ')}`);
      }
      
    } catch (error) {
      issues.push({
        type: 'READ_ERROR',
        model: modelName,
        file: path.basename(filePath),
        error: error.message
      });
    }
    
    return issues;
  }

  /**
   * Generate comprehensive summary
   */
  generateSummary() {
    const summary = this.results.summary;
    const allMissingOps = new Set();
    const allIncompleteSchemas = [];

    // Collect all unique missing operations
    Object.values(this.results.providers).forEach(provider => {
      provider.missingOperations.forEach(op => {
        allMissingOps.add(op.operation);
      });
      allIncompleteSchemas.push(...provider.incompleteSchemas);
    });

    summary.missingOperations = Array.from(allMissingOps);
    summary.incompleteSchemas = allIncompleteSchemas;
    summary.totalIssues = summary.missingOperations.length + allIncompleteSchemas.length;
  }

  /**
   * Print comprehensive test results
   */
  printResults() {
    console.log('\\n\\n🔍 COMPREHENSIVE CRUD VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    console.log('\\n🚨 CRITICAL ISSUES FOUND:');
    
    // Missing Operations
    console.log('\\n1. MISSING OPERATIONS (Across All Providers):');
    if (this.results.summary.missingOperations.length > 0) {
      this.results.summary.missingOperations.forEach(op => {
        console.log(`   ❌ ${op} - Expected but not generated`);
      });
    } else {
      console.log('   ✅ All expected operations are present');
    }
    
    // Incomplete Schemas
    console.log('\\n2. INCOMPLETE SCHEMAS:');
    const groupByIssues = this.results.summary.incompleteSchemas.filter(s => s.type === 'INCOMPLETE_GROUP_BY');
    if (groupByIssues.length > 0) {
      console.log('   GroupBy schemas missing aggregation fields:');
      groupByIssues.forEach(issue => {
        console.log(`   ❌ ${issue.model}: missing ${issue.missingFields.join(', ')}`);
      });
    } else {
      console.log('   ✅ All schemas are complete');
    }
    
    // Provider-specific breakdown
    console.log('\\n3. PROVIDER-SPECIFIC BREAKDOWN:');
    Object.entries(this.results.providers).forEach(([providerName, provider]) => {
      console.log(`\\n   ${providerName}:`);
      console.log(`     Missing Operations: ${provider.missingOperations.length}`);
      console.log(`     Incomplete Schemas: ${provider.incompleteSchemas.length}`);
      console.log(`     Total Issues: ${provider.issues.length}`);
    });
    
    // Priority Recommendations
    console.log('\\n\\n🎯 PRIORITY FIXES NEEDED:');
    console.log('\\n1. HIGH PRIORITY - Add missing aggregation fields to groupBy schemas:');
    console.log('   - Add _count field for count aggregations');
    console.log('   - Add _min field for minimum value aggregations');  
    console.log('   - Add _max field for maximum value aggregations');
    console.log('   - These are essential for Prisma groupBy functionality');
    
    console.log('\\n2. MEDIUM PRIORITY - Add missing CRUD operations:');
    console.log('   - findFirstOrThrow: Error-throwing variant of findFirst');
    console.log('   - findUniqueOrThrow: Error-throwing variant of findUnique');
    console.log('   - createManyAndReturn: CreateMany with returned records');
    console.log('   - updateManyAndReturn: UpdateMany with returned records');
    
    console.log('\\n3. LOW PRIORITY - Provider-specific optimizations:');
    console.log('   - MongoDB: Test complex type schemas (Address, SocialLinks)');
    console.log('   - PostgreSQL: Test Decimal type handling');
    console.log('   - SQL Server: Test without native enum support');
    
    console.log(`\\n\\n📊 TOTAL ISSUES FOUND: ${this.results.summary.totalIssues}`);
    
    if (this.results.summary.totalIssues === 0) {
      console.log('\\n🎉 All tests passed! Generated schemas are complete.');
    } else {
      console.log('\\n⚠️  Issues found that need attention to ensure full Prisma compatibility.');
    }
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const validator = new CrudValidationTest();
  validator.runTests().then(results => {
    // Exit with error code if issues found
    process.exit(results.summary.totalIssues > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = CrudValidationTest;