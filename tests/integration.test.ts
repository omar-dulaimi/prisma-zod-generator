import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  FileSystemUtils,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  SchemaValidationUtils,
  TestEnvironment,
} from './helpers';

describe('Integration Tests for Combined Features', () => {
  describe('Full Feature Integration', () => {
    it(
      'should generate schemas with all features enabled together',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-full-features');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            // Enable all features
            useMultipleFiles: true,
            addInputTypeValidation: true,
            addIncludeType: true,
            addSelectType: true,
            validateWhereUniqueInput: true,
            coerceDate: true,
            writeNullishInModelTypes: true,
            generateResultSchemas: true,
            pureModels: true,
            generateJSDoc: true,
            // Add configuration filtering
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'create', 'update'],
                fields: {
                  exclude: ['password'],
                },
              },
              Post: {
                enabled: true,
                operations: ['findMany', 'findUnique', 'create'],
                fields: {
                  exclude: ['views'],
                },
              },
            },
            // Add variants (new format)
            variants: {
              pure: {
                enabled: true,
                excludeFields: ['internalId', 'metadata'],
              },
              input: {
                enabled: true,
                excludeFields: ['internalId'],
              },
              result: {
                enabled: true,
                excludeFields: [],
              },
            },
            // Add minimal mode for some operations
            minimalMode: {
              enabled: true,
              operations: ['create', 'update'],
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

enum UserRole {
  ADMIN
  USER
  MODERATOR
}

model User {
  id         Int      @id @default(autoincrement())
  
  /**
   * User's email address
   * @example "user@example.com"
   */
  email      String   @unique /// @zod.email().toLowerCase()
  
  /// User's display name
  name       String?  /// @zod.min(2).max(50).trim()
  
  /// User's age
  age        Int?     /// @zod.min(0).max(120)
  
  password   String   // Should be excluded
  internalId String   // Should be excluded in variants
  metadata   Json?    // Should be excluded in public variant
  role       UserRole @default(USER)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  posts      Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  
  /// Post title
  title     String   /// @zod.min(1).max(200)
  
  /// Post content
  content   String?  /// @zod.min(10)
  
  views     Int      @default(0) // Should be excluded
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Verify directory structure
          expect(
            FileSystemUtils.validateDirectoryStructure(schemasDir, ['enums', 'objects', 'models']),
          ).toBe(true);

          // Check enum generation
          const enumsDir = join(schemasDir, 'enums');
          const userRoleEnumPath = join(enumsDir, 'UserRole.schema.ts');
          expect(existsSync(userRoleEnumPath)).toBe(true);

          // Check filtered operations
          const objectsDir = join(schemasDir, 'objects');

          // User should have findMany, create, update operations
          expect(existsSync(join(objectsDir, 'UserCreateInput.schema.ts'))).toBe(true);
          expect(existsSync(join(objectsDir, 'UserUpdateInput.schema.ts'))).toBe(true);
          expect(existsSync(join(objectsDir, 'UserWhereInput.schema.ts'))).toBe(true);

          // User should NOT have delete operations
          expect(existsSync(join(objectsDir, 'UserDeleteInput.schema.ts'))).toBe(false);

          // Post should have findMany, findUnique, create operations
          expect(existsSync(join(objectsDir, 'PostCreateInput.schema.ts'))).toBe(true);
          expect(existsSync(join(objectsDir, 'PostWhereUniqueInput.schema.ts'))).toBe(true);

          // Post should NOT have update operations
          expect(existsSync(join(objectsDir, 'PostUpdateInput.schema.ts'))).toBe(false);

          // Check field exclusions with @zod validations
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'name', 'age', 'role', 'isActive', 'internalId', 'metadata'],
              excludesFields: ['password'], // Only password excluded at model level
              hasValidations: ['.email()', '.toLowerCase()', '.min(2)', '.max(50)', '.trim()'],
            });
          }

          const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
          if (existsSync(postCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postCreatePath, {
              hasFields: ['title', 'content', 'published', 'author'],
              excludesFields: ['views'], // Excluded field
              hasValidations: ['.min(1)', '.max(200)', '.min(10)'],
            });
          }

          // Check that foreign key is present in UncheckedCreateInput
          const postUncheckedCreatePath = join(objectsDir, 'PostUncheckedCreateInput.schema.ts');
          if (existsSync(postUncheckedCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postUncheckedCreatePath, {
              hasFields: ['title', 'content', 'published', 'authorId'],
              excludesFields: ['views'], // Excluded field
              hasValidations: ['.min(1)', '.max(200)', '.min(10)'],
            });
          }

          // Check variant generation (new structure)
          const variantsDir = join(schemasDir, 'variants');
          expect(existsSync(variantsDir)).toBe(true);

          // Check pure variant (excludes internalId and metadata)
          const userPurePath = join(variantsDir, 'pure', 'User.pure.ts');
          expect(existsSync(userPurePath)).toBe(true);

          if (existsSync(userPurePath)) {
            SchemaValidationUtils.expectSchemaContent(userPurePath, {
              hasFields: ['email', 'name', 'age', 'role', 'isActive'],
              excludesFields: ['password', 'internalId', 'metadata'],
            });
          }

          // Check input variant (excludes only internalId)
          const userInputPath = join(variantsDir, 'input', 'User.input.ts');
          expect(existsSync(userInputPath)).toBe(true);

          if (existsSync(userInputPath)) {
            SchemaValidationUtils.expectSchemaContent(userInputPath, {
              hasFields: ['email', 'name', 'age', 'role', 'isActive', 'metadata'],
              excludesFields: ['password', 'internalId'],
            });
          }

          // Check result variant (no additional exclusions)
          const userResultPath = join(variantsDir, 'result', 'User.result.ts');
          expect(existsSync(userResultPath)).toBe(true);

          // Check pure models generation
          const modelsDir = join(schemasDir, 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');
          const postModelPath = join(modelsDir, 'Post.schema.ts');

          expect(existsSync(userModelPath)).toBe(true);
          expect(existsSync(postModelPath)).toBe(true);

          // Check include/select types
          expect(existsSync(join(objectsDir, 'UserInclude.schema.ts'))).toBe(true);
          expect(existsSync(join(objectsDir, 'UserSelect.schema.ts'))).toBe(true);

          // Check main index file
          const mainIndexPath = join(schemasDir, 'index.ts');
          expect(existsSync(mainIndexPath)).toBe(true);

          if (existsSync(mainIndexPath)) {
            const content = readFileSync(mainIndexPath, 'utf-8');

            // Should export from all directories
            expect(content).toMatch(/export.*from.*enums/);
            expect(content).toMatch(/export.*from.*objects/);
            expect(content).toMatch(/export.*from.*models/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle complex relationships with all features enabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-complex-relationships');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: true,
            addIncludeType: true,
            addSelectType: true,
            generateResultSchemas: true,
            pureModels: true,
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['posts'], // Exclude one-to-many relation
                },
              },
              Post: {
                enabled: true,
                fields: {
                  exclude: ['author'], // Exclude many-to-one relation
                },
              },
              Profile: {
                enabled: true,
                // Keep all relations
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  profile   Profile?
  comments  Comment[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  comments  Comment[]
  tags      Tag[]
}

model Profile {
  id       Int    @id @default(autoincrement())
  bio      String?
  website  String?
  user     User   @relation(fields: [userId], references: [id])
  userId   Int    @unique
}

model Comment {
  id       Int    @id @default(autoincrement())
  content  String
  post     Post   @relation(fields: [postId], references: [id])
  postId   Int
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // User exclude tests - should not have posts relation
          const userIncludePath = join(objectsDir, 'UserInclude.schema.ts');
          if (existsSync(userIncludePath)) {
            const content = readFileSync(userIncludePath, 'utf-8');
            expect(content).not.toMatch(/posts:/);
            expect(content).toMatch(/profile:/); // Should still have profile
            expect(content).toMatch(/comments:/); // Should still have comments
          }

          // Post exclude tests - should not have author relation
          const postIncludePath = join(objectsDir, 'PostInclude.schema.ts');
          if (existsSync(postIncludePath)) {
            const content = readFileSync(postIncludePath, 'utf-8');
            expect(content).not.toMatch(/author:/);
            expect(content).toMatch(/comments:/); // Should still have comments
            expect(content).toMatch(/tags:/); // Should still have tags
          }

          // Foreign keys should still be present
          const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
          if (existsSync(postCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postCreatePath, {
              hasFields: ['title', 'content', 'authorId'], // Foreign key preserved
              excludesFields: ['author'], // Relation excluded
            });
          }

          // Profile should include all relations (no exclusions)
          const profileIncludePath = join(objectsDir, 'ProfileInclude.schema.ts');
          if (existsSync(profileIncludePath)) {
            const content = readFileSync(profileIncludePath, 'utf-8');
            expect(content).toMatch(/user:/); // Should have user relation
          }

          // Many-to-many relationships should work correctly
          const tagIncludePath = join(objectsDir, 'TagInclude.schema.ts');
          if (existsSync(tagIncludePath)) {
            const content = readFileSync(tagIncludePath, 'utf-8');
            expect(content).toMatch(/posts:/); // Should have posts relation
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Error Handling and Edge Cases', () => {
    it(
      'should handle conflicting configuration gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-conflicting-config');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            // Conflicting settings
            useMultipleFiles: false, // Single file mode
            addIncludeType: true, // But enable include types
            addSelectType: true, // And select types
            models: {
              User: {
                enabled: false, // Disable User model
              },
              Post: {
                enabled: true,
                operations: ['create'], // Only create operation
              },
            },
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // Should not throw error
          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // In single-file mode, only the bundle should remain in schemasDir
          const bundlePath = join(schemasDir, 'schemas.ts');
          expect(existsSync(bundlePath)).toBe(true);
          expect(existsSync(join(schemasDir, 'index.ts'))).toBe(false);
          expect(existsSync(join(schemasDir, 'objects'))).toBe(false);

          // We can still do a light content check on the bundle
          const bundleContent = readFileSync(bundlePath, 'utf-8');
          expect(bundleContent).toMatch(/PostCreateInput/);
          expect(bundleContent).not.toMatch(/UserCreateInput/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle invalid @zod annotations with other features',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-invalid-zod');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: true,
            pureModels: true,
            variants: [
              {
                name: 'clean',
                suffix: 'Clean',
                exclude: ['badField'],
              },
            ],
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id       Int     @id @default(autoincrement())
  /// @zod.invalidMethod()
  email    String  @unique
  /// @zod.min()  // Missing parameter
  name     String?
  /// @zod.email()  // Valid annotation
  contact  String
  badField String  // Will be excluded in variant
  goodField String
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // Should not throw error for invalid @zod syntax
          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should apply valid @zod annotation
            expect(content).toMatch(/contact.*\.email\(\)/);

            // Should not include invalid syntax
            expect(content).not.toMatch(/\.invalidMethod\(\)/);
            expect(content).not.toMatch(/\.min\(\s*\)/);
          }

          // Variant should work despite invalid @zod annotations
          const schemasDir = join(testEnv.outputDir, 'schemas');
          const userCleanPath = join(schemasDir, 'UserClean.schema.ts');

          if (existsSync(userCleanPath)) {
            SchemaValidationUtils.expectSchemaContent(userCleanPath, {
              hasFields: ['email', 'name', 'contact', 'goodField'],
              excludesFields: ['badField'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it('should handle large schemas with all features efficiently', async () => {
      const testEnv = await TestEnvironment.createTestEnv('integration-large-schema');

      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: true,
          addIncludeType: true,
          addSelectType: true,
          generateResultSchemas: true,
          pureModels: true,
          generateJSDoc: true,
        };

        // Create a large schema with many models and fields
        const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

enum Status {
  ACTIVE
  INACTIVE
  PENDING
  SUSPENDED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model User {
  id            Int           @id @default(autoincrement())
  email         String        @unique
  firstName     String
  lastName      String
  username      String        @unique
  status        Status        @default(ACTIVE)
  isVerified    Boolean       @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  profile       Profile?
  posts         Post[]
  comments      Comment[]
  likes         Like[]
  followers     Follow[]      @relation("UserFollows")
  following     Follow[]      @relation("UserFollowing")
  notifications Notification[]
}

model Profile {
  id          Int      @id @default(autoincrement())
  bio         String?
  website     String?
  location    String?
  birthDate   DateTime?
  avatar      String?
  coverImage  String?
  phoneNumber String?
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
  userId      Int      @unique
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  content     String
  excerpt     String?
  slug        String    @unique
  status      Status    @default(PENDING)
  priority    Priority  @default(MEDIUM)
  publishedAt DateTime?
  featuredAt  DateTime?
  viewCount   Int       @default(0)
  likeCount   Int       @default(0)
  shareCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  author      User      @relation(fields: [authorId], references: [id])
  authorId    Int
  comments    Comment[]
  likes       Like[]
  tags        Tag[]
  categories  Category[]
}

model Comment {
  id          Int       @id @default(autoincrement())
  content     String
  status      Status    @default(PENDING)
  isEdited    Boolean   @default(false)
  editedAt    DateTime?
  likeCount   Int       @default(0)
  replyCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  post        Post      @relation(fields: [postId], references: [id])
  postId      Int
  author      User      @relation(fields: [authorId], references: [id])
  authorId    Int
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  parentId    Int?
  replies     Comment[] @relation("CommentReplies")
  likes       Like[]
}

model Like {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  post      Post?    @relation(fields: [postId], references: [id])
  postId    Int?
  comment   Comment? @relation(fields: [commentId], references: [id])
  commentId Int?
  
  @@unique([userId, postId])
  @@unique([userId, commentId])
}

model Follow {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  follower    User     @relation("UserFollows", fields: [followerId], references: [id])
  followerId  Int
  following   User     @relation("UserFollowing", fields: [followingId], references: [id])
  followingId Int
  
  @@unique([followerId, followingId])
}

model Tag {
  id          Int    @id @default(autoincrement())
  name        String @unique
  slug        String @unique
  description String?
  color       String?
  isVisible   Boolean @default(true)
  postCount   Int     @default(0)
  createdAt   DateTime @default(now())
  posts       Post[]
}

model Category {
  id          Int        @id @default(autoincrement())
  name        String     @unique
  slug        String     @unique
  description String?
  color       String?
  icon        String?
  isVisible   Boolean    @default(true)
  postCount   Int        @default(0)
  sortOrder   Int        @default(0)
  createdAt   DateTime   @default(now())
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  parentId    Int?
  children    Category[] @relation("CategoryHierarchy")
  posts       Post[]
}

model Notification {
  id        Int      @id @default(autoincrement())
  type      String
  title     String
  message   String
  isRead    Boolean  @default(false)
  data      Json?
  createdAt DateTime @default(now())
  readAt    DateTime?
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        const startTime = Date.now();
        await testEnv.runGeneration();
        const endTime = Date.now();

        // Should complete within reasonable time (less than 30 seconds)
        expect(endTime - startTime).toBeLessThan(30000);

        const schemasDir = join(testEnv.outputDir, 'schemas');

        // Should generate all expected directories
        expect(
          FileSystemUtils.validateDirectoryStructure(schemasDir, ['enums', 'objects', 'models']),
        ).toBe(true);

        // Should generate enum files
        const enumsDir = join(schemasDir, 'enums');
        expect(existsSync(join(enumsDir, 'Status.schema.ts'))).toBe(true);
        expect(existsSync(join(enumsDir, 'Priority.schema.ts'))).toBe(true);

        // Should generate object files for all models
        const objectsDir = join(schemasDir, 'objects');

        const expectedModels = [
          'User',
          'Profile',
          'Post',
          'Comment',
          'Like',
          'Follow',
          'Tag',
          'Category',
          'Notification',
        ];

        expectedModels.forEach((model) => {
          expect(existsSync(join(objectsDir, `${model}CreateInput.schema.ts`))).toBe(true);
          expect(existsSync(join(objectsDir, `${model}WhereInput.schema.ts`))).toBe(true);
          expect(existsSync(join(objectsDir, `${model}Include.schema.ts`))).toBe(true);
          expect(existsSync(join(objectsDir, `${model}Select.schema.ts`))).toBe(true);
        });

        // Should generate pure model files
        const modelsDir = join(schemasDir, 'models');
        expectedModels.forEach((model) => {
          expect(existsSync(join(modelsDir, `${model}.schema.ts`))).toBe(true);
        });

        // Should generate comprehensive index files
        expect(existsSync(join(schemasDir, 'index.ts'))).toBe(true);
        expect(existsSync(join(objectsDir, 'index.ts'))).toBe(true);
        expect(existsSync(join(modelsDir, 'index.ts'))).toBe(true);
      } finally {
        await testEnv.cleanup();
      }
    }, 60000); // Extended timeout for large schema
  });

  describe('Configuration Edge Cases', () => {
    it(
      'should handle empty and minimal configurations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-minimal-config');

        try {
          // Minimal configuration - just output directory
          const config = {
            output: `${testEnv.outputDir}/schemas`,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Should still generate basic schemas with default settings
          expect(existsSync(schemasDir)).toBe(true);

          // Should use single file mode by default
          expect(existsSync(join(schemasDir, 'index.ts'))).toBe(true);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle maximum configuration complexity',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-max-config');

        try {
          // Maximum complexity configuration
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: true,
            createInputTypes: true,
            createModelTypes: true,
            addInputTypeValidation: true,
            addIncludeType: true,
            addSelectType: true,
            validateWhereUniqueInput: true,
            createOptionalDefaultValuesTypes: true,
            createRelationValuesTypes: true,
            createPartialTypes: true,
            useDefaultValidators: true,
            coerceDate: true,
            writeNullishInModelTypes: true,
            prismaClientPath: '@prisma/client',
            generateResultSchemas: true,
            pureModels: true,
            generateJSDoc: true,
            // Complex filtering
            globalExclusions: ['password', 'secretKey'],
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'findUnique', 'create', 'update', 'upsert'],
                fields: {
                  exclude: ['internalId'],
                  include: ['email', 'name'],
                },
              },
              Post: {
                enabled: true,
                operations: ['findMany', 'create'],
                fields: {
                  exclude: ['views', 'metadata'],
                },
              },
            },
            // Multiple variants
            variants: [
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['email', 'phone', 'address'],
              },
              {
                name: 'internal',
                suffix: 'Internal',
                exclude: ['phone'],
              },
              {
                name: 'admin',
                suffix: 'Admin',
                exclude: [],
              },
            ],
            // Minimal mode
            minimalMode: {
              enabled: true,
              operations: ['create', 'findUnique'],
            },
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

enum UserRole {
  ADMIN
  USER
  MODERATOR
  GUEST
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique /// @zod.email()
  name       String   /// @zod.min(1).max(100)
  phone      String?  /// @zod.regex(/^\\+?[1-9]\\d{1,14}$/)
  address    String?
  password   String   // Global exclusion
  secretKey  String   // Global exclusion
  internalId String   // Model exclusion
  role       UserRole @default(USER)
  isActive   Boolean  @default(true)
  metadata   Json?
  createdAt  DateTime @default(now())
  posts      Post[]
}

model Post {
  id        Int        @id @default(autoincrement())
  title     String     /// @zod.min(1).max(200)
  content   String?    /// @zod.min(10)
  status    PostStatus @default(DRAFT)
  views     Int        @default(0) // Model exclusion
  metadata  Json?      // Model exclusion
  password  String     // Global exclusion
  secretKey String     // Global exclusion
  createdAt DateTime   @default(now())
  author    User       @relation(fields: [authorId], references: [id])
  authorId  Int
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Should handle all configuration options without errors
          expect(existsSync(schemasDir)).toBe(true);

          // Check all variants are generated (stored under variants/ directory)
          const variantsDir = join(schemasDir, 'variants');
          expect(existsSync(variantsDir)).toBe(true);
          expect(existsSync(join(variantsDir, 'UserPublic.schema.ts'))).toBe(true);
          expect(existsSync(join(variantsDir, 'UserInternal.schema.ts'))).toBe(true);
          expect(existsSync(join(variantsDir, 'UserAdmin.schema.ts'))).toBe(true);

          // Check complex exclusion combinations
          const userPublicPath = join(schemasDir, 'UserPublic.schema.ts');
          if (existsSync(userPublicPath)) {
            // Should exclude: global (password, secretKey) + model (internalId) + variant (email, phone, address)
            SchemaValidationUtils.expectSchemaContent(userPublicPath, {
              hasFields: ['name', 'role', 'isActive'],
              excludesFields: ['password', 'secretKey', 'internalId', 'email', 'phone', 'address'],
            });
          }

          const userAdminPath = join(schemasDir, 'UserAdmin.schema.ts');
          if (existsSync(userAdminPath)) {
            // Should exclude: global (password, secretKey) + model (internalId) only
            SchemaValidationUtils.expectSchemaContent(userAdminPath, {
              hasFields: ['email', 'name', 'phone', 'address', 'role', 'isActive'],
              excludesFields: ['password', 'secretKey', 'internalId'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Performance and Memory Usage', () => {
    it(
      'should generate schemas efficiently with memory constraints',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-performance');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: true,
            addIncludeType: true,
            addSelectType: true,
            generateResultSchemas: true,
            pureModels: true,
          };

          // Create schema with moderate complexity to test performance
          const schema = PrismaSchemaGenerator.createComprehensiveSchema();
          const updatedSchema = schema.replace(
            'output   = "./generated/schemas"',
            `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
          );

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, updatedSchema);

          const startTime = Date.now();
          const startMemory = process.memoryUsage();

          await testEnv.runGeneration();

          const endTime = Date.now();
          const endMemory = process.memoryUsage();

          // Performance checks
          const executionTime = endTime - startTime;
          const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

          // Should complete within reasonable time (less than 45 seconds; relaxed due to environment variability)
          expect(executionTime).toBeLessThan(45000);

          // Memory increase should be reasonable (less than 100MB)
          expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

          console.log(`Performance metrics:
          Execution time: ${executionTime}ms
          Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

          // Verify output quality
          const schemasDir = join(testEnv.outputDir, 'schemas');
          expect(existsSync(schemasDir)).toBe(true);

          // Should generate expected file count
          const schemaFiles = FileSystemUtils.getSchemaFiles(schemasDir);
          expect(schemaFiles.length).toBeGreaterThan(10);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
