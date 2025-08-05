/**
 * Generated Zod model for User
 * @generated 2025-08-02T17:04:51.358Z
 * @generator prisma-zod-generator
 */

import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { PostModel } from './Post.model';

/**
 * Zod schema for User model
 *
 * @model User
 * @fields 8
 * @scalars 6
 * @relations 1
 * @enums 1
 *
 * Generated with enhanced type mapping, validation, and documentation.
 */
export const UserModel = z.object({
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
   * @generated Zod schema for User.id
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
   * @unique Unique constraint
   *
   * @example
   * "example string"
   *
   * @generated Zod schema for User.email
   */
  email: z.string(),

  /**
   * @type {string | undefined}
   * @optional schema optional
   *
   * @example
   * "example string"
   *
   * @generated Zod schema for User.name
   */
  name: z.string().optional(),
  // Field optionality: schema_optional
  // Field marked as optional in Prisma schema

  /**
   * @type {string}
   *
   * @example
   * "example string"
   *
   * @generated Zod schema for User.password
   */
  password: z.string(),

  /**
   * @type {enum}
   * @default "USER"
   *
   * @generated Zod schema for User.role
   */
  role: z.enum(UserRole).default("USER"),
  // Enum type: UserRole
  // Field optionality: required
  // Default value: "USER"

  /**
   * @type {boolean}
   * @default true
   *
   * @example
   * true
   *
   * @generated Zod schema for User.isActive
   */
  isActive: z.boolean().default(true),
  // Field optionality: required
  // Default value: true

  /**
   * @type {Date | undefined}
   * @default now()
   * @optional auto generated
   * @enhanced Custom validations applied
   *
   * @example
   * new Date()
   *
   * @generated Zod schema for User.createdAt
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
   * @type {Array[] | undefined}
   * @optional back relation
   * @enhanced Custom validations applied
   *
   * @example
   * []
   *
   * @generated Zod schema for User.posts
   */
  posts: z.array(z.lazy(() => PostModel)).optional(),
  // Back-relation to Post
  // Array field
  // Field optionality: back_relation
  // Back-relation field, typically optional
});

/**
 * Inferred TypeScript type for User
 */
export type UserType = z.infer<typeof UserModel>;

/**
 * Schema Statistics:
 * - Total fields: 8
 * - Processed fields: 8
 * - Fields with validations: 6
 * - Enhanced fields: 3
 * - Relation fields: 1
 * - Complex type fields: 1
 */