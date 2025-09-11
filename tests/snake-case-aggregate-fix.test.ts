import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Snake case aggregate input fix', () => {
  it(
    'generates correct aggregate input imports for complex schema with relationships and variants',
    async () => {
      const env = await TestEnvironment.createTestEnv('snake-case-aggregate-complex');
      try {
        // Config that matches the user's requirements
        const config = {
          mode: 'full' as const,
          useMultipleFiles: false,
          singleFileName: 'index.ts',
          placeSingleFileAtRoot: true,
          pureModels: true,
          variants: {
            pure: { enabled: true, suffix: '.model' },
            enum: { enabled: true, suffix: '.enum' },
            input: { enabled: true, suffix: '.input' },
            result: { enabled: true, suffix: '.result' },
          },
        } as Partial<import('../src/config/parser').GeneratorConfig>;

        const configPath = join(env.testDir, 'zod-generator.config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Complex schema with relationships and various naming patterns
        const complexSchema = `
generator client {
  provider = "prisma-client"
  output   = "../app/generated"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
  config   = "./zod-generator.config.json"
}

model User {
  id            String    @id
  name          String
  status        String
  isActive      Boolean   @default(false)
  role          String?
  expires       DateTime?
  token         String
  parentId      BigInt?
  firstName     String?
  lastName      String?
  email         String?
  isOwner       Boolean   @default(false)
  locale        String?
  isCollaborator Boolean? @default(false)
  emailVerified  Boolean? @default(false)

  profile     Profile?
  projects    Project[]
  tasks       Task[]
}

enum ProfileStatus {
  ACTIVE
  INACTIVE
  PENDING
}

model Profile {
  id           String        @id @default(uuid())
  name         String
  verified     Boolean       @default(false)
  userId       String        @unique
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId        String?
  status       ProfileStatus @default(ACTIVE)
  paused       Boolean       @default(false)
  lastUpdated  DateTime?
}

model Project {
  id       String @id @default(uuid())
  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  name      String
  projectId String
  type      String

  tasks Task[]

  @@unique([userId, id])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  CANCELLED
  ON_HOLD
}

model Task {
  id        String @id @default(uuid())
  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  dueDate     DateTime
  timezone    String
  isUrgent    Boolean
  jobId       String?

  status TaskStatus @default(TODO)

  completedAt DateTime?

  @@unique([userId, id])
}
        `.trim();

        writeFileSync(env.schemaPath, complexSchema);
        await env.runGeneration();

        const outputDir = join(env.testDir, 'generated');
        const bundlePath = join(outputDir, 'index.ts');

        // Verify single file was created at root
        expect(existsSync(bundlePath)).toBe(true);

        const content = readFileSync(bundlePath, 'utf-8');

        // Test 1: Verify aggregate input schemas are generated correctly
        expect(content).toMatch(/UserCountAggregateInput/);
        expect(content).toMatch(/UserMinAggregateInput/);
        expect(content).toMatch(/UserMaxAggregateInput/);
        expect(content).toMatch(/ProfileCountAggregateInput/);
        expect(content).toMatch(/ProjectCountAggregateInput/);
        expect(content).toMatch(/TaskCountAggregateInput/);

        // Test 2: Verify no broken import references (the original bug)
        // These should NOT exist (the bug we fixed)
        expect(content).not.toMatch(/DocParserAgentCountAggregateInput/);
        expect(content).not.toMatch(/from.*objects.*DocParserAgent/);

        // Test 3: Verify enum schemas are present with correct suffixes
        expect(content).toMatch(/ProfileStatusSchema/);
        expect(content).toMatch(/TaskStatusSchema/);

        // Test 4: Verify pure model schemas are present with suffixes
        expect(content).toMatch(/UserSchema.*=.*z\.object/);
        expect(content).toMatch(/ProfileSchema.*=.*z\.object/);
        expect(content).toMatch(/ProjectSchema.*=.*z\.object/);
        expect(content).toMatch(/TaskSchema.*=.*z\.object/);

        // Test 5: Verify aggregate operations include correct field references
        // User has BigInt parentId field, so should have sum/avg aggregates
        expect(content).toMatch(/UserAggregateSchema.*_count.*_min.*_max/s);
        expect(content).toMatch(/UserGroupBySchema.*_count.*_min.*_max/s);

        // Test 6: Verify proper Prisma type imports are present
        expect(content).toMatch(/import type \{ Prisma \} from/);
        expect(content).toMatch(/z\.ZodType<Prisma\./);

        // Test 7: Verify relationships are properly handled
        expect(content).toMatch(/userId.*z\.string\(\)/);
        expect(content).toMatch(/projectId.*z\.string\(\)/);

        // Test 8: Verify no subdirectories exist (single file mode)
        expect(existsSync(join(outputDir, 'objects'))).toBe(false);
        expect(existsSync(join(outputDir, 'enums'))).toBe(false);
        expect(existsSync(join(outputDir, 'models'))).toBe(false);

        // Test 9: Verify TypeScript compilation passes
        const { execSync } = await import('child_process');
        expect(() => {
          execSync(`npx tsc --noEmit --skipLibCheck ${bundlePath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });
        }).not.toThrow();

        console.log(
          `✅ Snake case aggregate fix test passed - generated bundle has ${content.split('\n').length} lines`,
        );
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'handles aggregate inputs correctly for models with snake_case-like naming',
    async () => {
      const env = await TestEnvironment.createTestEnv('snake-case-naming-test');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: true, // Test multi-file mode as well
        };
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Schema with snake_case-like model that caused original bug
        const snakeCaseSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" 
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
  config   = "./config.json"
}

model doc_parser_agent {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                 String
  project_id           String   @db.Uuid
  description          String?
  organization_id      String   @default(dbgenerated("(current_setting('request.jwt.claims', true)::json->>'organization_id')::uuid")) @db.Uuid
  role_name            String
  data_schema          Json     @db.JsonB
  config               Json     @db.JsonB
  custom_configuration Json     @db.JsonB
  created_at           DateTime @default(now())
  updated_at           DateTime @default(now()) @updatedAt
}

model user_profile {
  id          Int      @id @default(autoincrement())
  user_name   String   @unique
  first_name  String?
  last_name   String?  
  age         Int?
  salary      Float?
  created_at  DateTime @default(now())
}
        `.trim();

        writeFileSync(env.schemaPath, snakeCaseSchema);
        await env.runGeneration();

        const schemasDir = join(env.testDir, 'generated/schemas');

        // Test aggregate files exist and compile
        const docAggregatePath = join(schemasDir, 'aggregatedoc_parser_agent.schema.ts');
        const userAggregatePath = join(schemasDir, 'aggregateuser_profile.schema.ts');

        expect(existsSync(docAggregatePath)).toBe(true);
        expect(existsSync(userAggregatePath)).toBe(true);

        const docAggregateContent = readFileSync(docAggregatePath, 'utf-8');
        const userAggregateContent = readFileSync(userAggregatePath, 'utf-8');

        // Test that imports use correct naming format (the fix)
        expect(docAggregateContent).toMatch(
          /from.*objects\/Doc_parser_agentCountAggregateInput\.schema/,
        );
        expect(docAggregateContent).toMatch(
          /from.*objects\/Doc_parser_agentMinAggregateInput\.schema/,
        );
        expect(docAggregateContent).toMatch(
          /from.*objects\/Doc_parser_agentMaxAggregateInput\.schema/,
        );

        expect(userAggregateContent).toMatch(
          /from.*objects\/User_profileCountAggregateInput\.schema/,
        );
        expect(userAggregateContent).toMatch(
          /from.*objects\/User_profileMinAggregateInput\.schema/,
        );
        expect(userAggregateContent).toMatch(
          /from.*objects\/User_profileMaxAggregateInput\.schema/,
        );

        // Verify the actual aggregate input files exist with correct naming
        const docCountInputPath = join(
          schemasDir,
          'objects/Doc_parser_agentCountAggregateInput.schema.ts',
        );
        const userAvgInputPath = join(
          schemasDir,
          'objects/User_profileAvgAggregateInput.schema.ts',
        );
        const userSumInputPath = join(
          schemasDir,
          'objects/User_profileSumAggregateInput.schema.ts',
        );

        expect(existsSync(docCountInputPath)).toBe(true);
        expect(existsSync(userAvgInputPath)).toBe(true); // user_profile has numeric fields
        expect(existsSync(userSumInputPath)).toBe(true);

        // Test TypeScript compilation passes
        const { execSync } = await import('child_process');
        expect(() => {
          execSync(`npx tsc --noEmit --skipLibCheck ${schemasDir}/**/*.ts`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });
        }).not.toThrow();

        console.log('✅ Multi-file snake_case aggregate naming test passed');
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'validates aggregate input schema content matches expected patterns',
    async () => {
      const env = await TestEnvironment.createTestEnv('aggregate-content-validation');
      try {
        const config = ConfigGenerator.createBasicConfig();
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"  
  output   = "./generated"
  config   = "./config.json"
}

model test_model {
  id         String   @id @default(uuid())
  name       String
  count      Int      @default(0) 
  score      Float?
  amount     BigInt   @default(0)
  created_at DateTime @default(now())
}
        `.trim();

        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();

        const schemasDir = join(env.testDir, 'generated/schemas');

        // Verify aggregate input files have correct content structure
        const countInputPath = join(schemasDir, 'objects/Test_modelCountAggregateInput.schema.ts');
        const avgInputPath = join(schemasDir, 'objects/Test_modelAvgAggregateInput.schema.ts');
        const sumInputPath = join(schemasDir, 'objects/Test_modelSumAggregateInput.schema.ts');

        expect(existsSync(countInputPath)).toBe(true);
        expect(existsSync(avgInputPath)).toBe(true);
        expect(existsSync(sumInputPath)).toBe(true);

        const countContent = readFileSync(countInputPath, 'utf-8');
        const avgContent = readFileSync(avgInputPath, 'utf-8');
        const sumContent = readFileSync(sumInputPath, 'utf-8');

        // Count aggregate should include all fields
        expect(countContent).toMatch(/id:\s*z\.literal\(true\)\.optional\(\)/);
        expect(countContent).toMatch(/name:\s*z\.literal\(true\)\.optional\(\)/);
        expect(countContent).toMatch(/count:\s*z\.literal\(true\)\.optional\(\)/);
        expect(countContent).toMatch(/score:\s*z\.literal\(true\)\.optional\(\)/);
        expect(countContent).toMatch(/amount:\s*z\.literal\(true\)\.optional\(\)/);
        expect(countContent).toMatch(/created_at:\s*z\.literal\(true\)\.optional\(\)/);

        // Avg aggregate should only include numeric fields
        expect(avgContent).toMatch(/count:\s*z\.literal\(true\)\.optional\(\)/);
        expect(avgContent).toMatch(/score:\s*z\.literal\(true\)\.optional\(\)/);
        expect(avgContent).toMatch(/amount:\s*z\.literal\(true\)\.optional\(\)/);
        expect(avgContent).not.toMatch(/name:/);
        expect(avgContent).not.toMatch(/created_at:/);

        // Sum aggregate should only include numeric fields
        expect(sumContent).toMatch(/count:\s*z\.literal\(true\)\.optional\(\)/);
        expect(sumContent).toMatch(/score:\s*z\.literal\(true\)\.optional\(\)/);
        expect(sumContent).toMatch(/amount:\s*z\.literal\(true\)\.optional\(\)/);
        expect(sumContent).not.toMatch(/name:/);
        expect(sumContent).not.toMatch(/created_at:/);

        console.log('✅ Aggregate input content validation test passed');
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
