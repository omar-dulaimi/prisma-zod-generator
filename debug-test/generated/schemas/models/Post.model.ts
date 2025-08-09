/**
 * Generated Zod model for Post
 * @generated 2025-08-02T17:04:51.381Z
 * @generator prisma-zod-generator
 */

import { z } from 'zod';
import { UserModel } from './User.model';

/**
 * Zod schema for Post model
 *
 * @model Post
 * @fields 8
 * @scalars 7
 * @relations 1
 *
 * Generated with enhanced type mapping, validation, and documentation.
 */
export const PostModel = z.object({
  /**
   * @type {number | undefined}
   * @primary Primary key field
   * @default autoincrement()
   * @optional auto generated
   * @enhanced Custom validations applied
   *
   * @example
   * 1
   *
   * @generated Zod schema for Post.id
   */
  id: z.number().int().optional(),
  // Integer validation applied
  // Field optionality: auto_generated
  // Field has default value, making it optional for input
  // Default function: autoincrement()
  // Auto-generated field, optional for input
  // PostgreSQL serial/bigserial primary key
  // Auto-generated field - handle with care in mutations

  /**
   * @type {string}
   *
   * @example
   * "example string"
   *
   * @generated Zod schema for Post.title
   */
  title: z.string(),

  /**
   * @type {string | undefined}
   * @optional schema optional
   *
   * @example
   * "example string"
   *
   * @generated Zod schema for Post.content
   */
  content: z.string().optional(),
  // Field optionality: schema_optional
  // Field marked as optional in Prisma schema

  /**
   * @type {number}
   * @default 0
   *
   * @example
   * 123
   *
   * @generated Zod schema for Post.views
   */
  views: z.number().int(),
  // Integer validation applied
  // Field optionality: required

  /**
   * @type {boolean}
   * @default false
   *
   * @example
   * true
   *
   * @generated Zod schema for Post.published
   */
  published: z.boolean(),
  // Field optionality: required

  /**
   * @type {Date | undefined}
   * @default now()
   * @optional auto generated
   * @enhanced Custom validations applied
   *
   * @example
   * new Date()
   *
   * @generated Zod schema for Post.createdAt
   */
  createdAt: z.date().optional(),
  // Strict date validation enabled
  // Timezone: Original timezone information preserved
  // Field optionality: auto_generated
  // Field has default value, making it optional for input
  // Default function: now()
  // Auto-generated field, optional for input
  // Auto-generated field - handle with care in mutations

  /**
   * @type {lazy}
   * @enhanced Custom validations applied
   *
   * @generated Zod schema for Post.author
   */
  author: z.lazy(() => UserModel),
  // Relation to User

  /**
   * @type {number}
   *
   * @example
   * 123
   *
   * @generated Zod schema for Post.authorId
   */
  authorId: z.number().int(),
  // Integer validation applied
});

/**
 * Inferred TypeScript type for Post
 */
export type PostType = z.infer<typeof PostModel>;

/**
 * Schema Statistics:
 * - Total fields: 8
 * - Processed fields: 8
 * - Fields with validations: 7
 * - Enhanced fields: 3
 * - Relation fields: 1
 * - Complex type fields: 1
 */