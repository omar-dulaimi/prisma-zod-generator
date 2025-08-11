// Derive client request schemas from generated model/input using omit/extend (Issue #49)
import { z } from "zod";
// import { UserModelSchema } from "./generated"; // adjust import to your generated output

// Example base model schema
const UserModelSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Fields clients should not send
const omitFromClient = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true
} as const;

export const CreateUserRequest = UserModelSchema.omit(omitFromClient).extend({
  password: z.string().min(8)
});

export type CreateUserRequest = z.infer<typeof CreateUserRequest>;
