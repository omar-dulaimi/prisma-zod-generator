import { z } from 'zod';

export const TransactionIsolationLevelSchema = z.enum(['Serializable']);
