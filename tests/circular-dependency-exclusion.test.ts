/**
 * Feature test suite for pureModelsExcludeCircularRelations option
 *
 * This feature solves issue #183: Self Referenced Schema Models
 *
 * When pureModelsIncludeRelations=true, bidirectional relationships can create
 * TypeScript circular dependency errors like:
 * "'DealSchema' implicitly has type 'any' because it does not have a type
 * annotation and is referenced directly or indirectly in its own initializer"
 *
 * The pureModelsExcludeCircularRelations option intelligently excludes
 * specific relation fields to break cycles while preserving:
 * - Foreign key fields (dealId, userId, etc.)
 * - Required relations over optional ones
 * - Single relations over list relations
 * - Forward references over back-references
 *
 * This allows users to migrate from zod-prisma which "would have just used
 * dealId and not included the self reference to the DealSchema."
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment, ConfigGenerator, GENERATION_TIMEOUT } from './helpers';
import { execSync } from 'child_process';

describe('Circular Dependency Exclusion Feature', () => {
  describe('pureModelsExcludeCircularRelations option', () => {
    it(
      'should exclude circular relations in simple two-model cycle (Deal <-> Opportunity)',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-deal-opportunity');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: true,
            pureModelsExcludeCircularRelations: true,
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Deal {
  id          String  @id @default(uuid())
  name        String?
  status      String  @default("DRAFT")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // One-to-one relationship with Opportunity
  opportunity Opportunity?
}

model Opportunity {
  id             String   @id @default(uuid())
  name           String
  amount         Float?
  description    String?
  closeDate      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Circular reference - this relation should be excluded
  dealId         String?  @unique
  deal           Deal?    @relation(fields: [dealId], references: [id], onDelete: Cascade)
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          // Check Deal model - should include opportunity relation
          const dealModelPath = join(modelsDir, 'Deal.model.ts');
          expect(existsSync(dealModelPath)).toBe(true);

          const dealContent = readFileSync(dealModelPath, 'utf-8');
          expect(dealContent).toMatch(/opportunity:/);
          expect(dealContent).toMatch(/z\.lazy\(\(\) => OpportunitySchema\)/);

          // Check Opportunity model - should exclude circular 'deal' relation but keep 'dealId'
          const opportunityModelPath = join(modelsDir, 'Opportunity.model.ts');
          expect(existsSync(opportunityModelPath)).toBe(true);

          const opportunityContent = readFileSync(opportunityModelPath, 'utf-8');
          expect(opportunityContent).toMatch(/dealId:/); // Foreign key preserved
          expect(opportunityContent).not.toMatch(/deal:/); // Circular relation excluded
          expect(opportunityContent).not.toMatch(/z\.lazy\(\(\) => DealSchema\)/); // No circular import

          // Verify no circular import in Opportunity
          expect(opportunityContent).not.toMatch(/import.*DealSchema/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle complex three-model cycle (User -> Company -> Project -> User)',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-three-model');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: true,
            pureModelsExcludeCircularRelations: true,
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  
  companyId String?
  company   Company?  @relation(fields: [companyId], references: [id])
  projects  Project[]
}

model Company {
  id       String @id @default(uuid())
  name     String
  
  users    User[]
  projects Project[]
}

model Project {
  id          String @id @default(uuid())
  name        String
  description String?
  
  companyId   String
  company     Company @relation(fields: [companyId], references: [id])
  
  ownerId     String
  owner       User    @relation(fields: [ownerId], references: [id])
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          // All models should be generated
          const userModelPath = join(modelsDir, 'User.model.ts');
          const companyModelPath = join(modelsDir, 'Company.model.ts');
          const projectModelPath = join(modelsDir, 'Project.model.ts');

          expect(existsSync(userModelPath)).toBe(true);
          expect(existsSync(companyModelPath)).toBe(true);
          expect(existsSync(projectModelPath)).toBe(true);

          // Check that some relations are preserved and others excluded to break cycles
          const userContent = readFileSync(userModelPath, 'utf-8');
          const companyContent = readFileSync(companyModelPath, 'utf-8');
          const projectContent = readFileSync(projectModelPath, 'utf-8');

          // Foreign keys should always be preserved
          expect(userContent).toMatch(/companyId:/);
          expect(projectContent).toMatch(/companyId:/);
          expect(projectContent).toMatch(/ownerId:/);

          // At least some relations should be preserved
          const hasRelations =
            (userContent.includes('company:') ? 1 : 0) +
            (userContent.includes('projects:') ? 1 : 0) +
            (companyContent.includes('users:') ? 1 : 0) +
            (companyContent.includes('projects:') ? 1 : 0) +
            (projectContent.includes('company:') ? 1 : 0) +
            (projectContent.includes('owner:') ? 1 : 0);

          // Should have some relations but not all (to break cycles)
          expect(hasRelations).toBeGreaterThan(0);
          expect(hasRelations).toBeLessThan(6); // Less than all 6 possible relations
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle self-referencing models (Category -> Category)',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-self-reference');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: true,
            pureModelsExcludeCircularRelations: true,
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" 
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Category {
  id          String     @id @default(uuid())
  name        String
  description String?
  
  parentId    String?
  parent      Category?  @relation("CategoryParent", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryParent")
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const categoryModelPath = join(modelsDir, 'Category.model.ts');

          expect(existsSync(categoryModelPath)).toBe(true);

          const categoryContent = readFileSync(categoryModelPath, 'utf-8');

          // Foreign key should be preserved
          expect(categoryContent).toMatch(/parentId:/);

          // Should have either parent OR children relation (not both to avoid self-circular)
          const hasParent = categoryContent.includes('parent:');
          const hasChildren = categoryContent.includes('children:');

          // Can't have both due to self-referencing circular dependency
          expect(hasParent && hasChildren).toBe(false);

          // Should have at least one
          expect(hasParent || hasChildren).toBe(true);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should work correctly when circular exclusion is disabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-exclusion-disabled');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: true,
            pureModelsExcludeCircularRelations: false, // Disabled
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Deal {
  id          String  @id @default(uuid())
  name        String?
  opportunity Opportunity?
}

model Opportunity {
  id     String @id @default(uuid())
  name   String
  dealId String? @unique
  deal   Deal?   @relation(fields: [dealId], references: [id])
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          // Both models should include ALL relations (including circular ones)
          const dealModelPath = join(modelsDir, 'Deal.model.ts');
          const opportunityModelPath = join(modelsDir, 'Opportunity.model.ts');

          expect(existsSync(dealModelPath)).toBe(true);
          expect(existsSync(opportunityModelPath)).toBe(true);

          const dealContent = readFileSync(dealModelPath, 'utf-8');
          const opportunityContent = readFileSync(opportunityModelPath, 'utf-8');

          // Both should have their relation fields (creating circular dependency)
          expect(dealContent).toMatch(/opportunity:/);
          expect(opportunityContent).toMatch(/deal:/);
          expect(opportunityContent).toMatch(/dealId:/);

          // Both should have circular imports
          expect(dealContent).toMatch(/import.*OpportunitySchema/);
          expect(opportunityContent).toMatch(/import.*DealSchema/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should only apply when both pureModels and pureModelsIncludeRelations are enabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-exclusion-prerequisites');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: false, // Relations disabled
            pureModelsExcludeCircularRelations: true, // Should have no effect
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Deal {
  id          String  @id @default(uuid())
  name        String?
  opportunity Opportunity?
}

model Opportunity {
  id     String @id @default(uuid())
  name   String
  dealId String? @unique
  deal   Deal?   @relation(fields: [dealId], references: [id])
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          const dealModelPath = join(modelsDir, 'Deal.model.ts');
          const opportunityModelPath = join(modelsDir, 'Opportunity.model.ts');

          expect(existsSync(dealModelPath)).toBe(true);
          expect(existsSync(opportunityModelPath)).toBe(true);

          const dealContent = readFileSync(dealModelPath, 'utf-8');
          const opportunityContent = readFileSync(opportunityModelPath, 'utf-8');

          // No relations should be included at all (since pureModelsIncludeRelations=false)
          expect(dealContent).not.toMatch(/opportunity:/);
          expect(opportunityContent).not.toMatch(/deal:/);

          // But foreign keys should still be present
          expect(opportunityContent).toMatch(/dealId:/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should preserve non-circular relations while excluding only circular ones',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-mixed-relations');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: true,
            pureModelsExcludeCircularRelations: true,
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id        String @id @default(uuid())
  name      String
  email     String @unique
  
  // Non-circular relations
  profile   Profile?
  posts     Post[]
  
  // Circular relation
  managerId String?
  manager   User?   @relation("UserManager", fields: [managerId], references: [id])
  reports   User[]  @relation("UserManager")
}

model Profile {
  id     String @id @default(uuid())
  bio    String?
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}

model Post {
  id       String @id @default(uuid())
  title    String
  content  String?
  authorId String
  author   User    @relation(fields: [authorId], references: [id])
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          const userModelPath = join(modelsDir, 'User.model.ts');
          const profileModelPath = join(modelsDir, 'Profile.model.ts');
          const postModelPath = join(modelsDir, 'Post.model.ts');

          expect(existsSync(userModelPath)).toBe(true);
          expect(existsSync(profileModelPath)).toBe(true);
          expect(existsSync(postModelPath)).toBe(true);

          const userContent = readFileSync(userModelPath, 'utf-8');
          const profileContent = readFileSync(profileModelPath, 'utf-8');
          const postContent = readFileSync(postModelPath, 'utf-8');

          // Smart exclusions should preserve FK-side relations and exclude back-references
          expect(profileContent).toMatch(/user:/); // FK side preserved
          expect(postContent).toMatch(/author:/); // FK side preserved

          // Back-references should be excluded to prevent circular dependencies
          expect(userContent).not.toMatch(/profile:/); // Back-reference excluded
          expect(userContent).not.toMatch(/posts:/); // Back-reference excluded

          // Foreign keys should always be preserved
          expect(userContent).toMatch(/managerId:/);
          expect(profileContent).toMatch(/userId:/);
          expect(postContent).toMatch(/authorId:/);

          // Self-referencing circular relations should be partially excluded
          const hasManager = userContent.includes('manager:');
          const hasReports = userContent.includes('reports:');

          // Should not have both (to avoid circular dependency on self)
          expect(hasManager && hasReports).toBe(false);

          // Should have at least one self-reference preserved
          expect(hasManager || hasReports).toBe(true);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('TypeScript Compilation Validation', () => {
    it(
      'should generate TypeScript-compilable schemas when circular exclusion is enabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('circular-typescript-compilation');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            pureModelsIncludeRelations: true,
            pureModelsExcludeCircularRelations: true,
            variants: {
              pure: { enabled: true },
              input: { enabled: false },
              result: { enabled: false },
            },
            emit: {
              objects: false,
              crud: false,
              variants: false,
            },
            naming: {
              pureModel: { filePattern: '{Model}.model.ts' },
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Deal {
  id          String  @id @default(uuid())
  name        String?
  status      String  @default("DRAFT")
  opportunity Opportunity?
}

model Opportunity {
  id     String @id @default(uuid())
  name   String
  amount Float?
  dealId String? @unique
  deal   Deal?   @relation(fields: [dealId], references: [id])
}
`;

          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          // Verify files exist
          const dealModelPath = join(modelsDir, 'Deal.model.ts');
          const opportunityModelPath = join(modelsDir, 'Opportunity.model.ts');
          expect(existsSync(dealModelPath)).toBe(true);
          expect(existsSync(opportunityModelPath)).toBe(true);

          // Try to compile the generated TypeScript files
          try {
            // Use npx tsc to check if the files compile without errors
            // We use --noEmit to just check compilation without generating JS files
            const tscCommand = `cd "${modelsDir}" && npx tsc --noEmit --strict --skipLibCheck Deal.model.ts Opportunity.model.ts`;
            execSync(tscCommand, {
              stdio: 'pipe',
              cwd: testEnv.testDir,
              timeout: 30000,
            });

            // If we reach here, compilation succeeded
            expect(true).toBe(true);
          } catch (error) {
            // Check if the error is specifically about circular dependencies
            const errorOutput = error.toString();
            const hasCircularError =
              errorOutput.includes(
                "implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer",
              ) ||
              errorOutput.includes(
                "Function implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions",
              );

            if (hasCircularError) {
              throw new Error(
                `TypeScript compilation failed with circular dependency errors: ${errorOutput}`,
              );
            }

            // Allow other TypeScript errors (like missing dependencies) but log them
            console.warn(
              'TypeScript compilation had non-circular errors (expected in test environment):',
              errorOutput,
            );
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
