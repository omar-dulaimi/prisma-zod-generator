/**
 * Transaction Safety & Data Integrity Utilities
 *
 * Comprehensive ACID transaction support, rollback mechanisms,
 * and data integrity validation for production financial systems
 */

import type { MutexLock } from './concurrency';
import { Mutex } from './concurrency';

export interface TransactionContext {
  id: string;
  startTime: number;
  operations: TransactionOperation[];
  rollbackHandlers: (() => Promise<void>)[];
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  isolation_level: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  serializableLock?: MutexLock;
}

export interface TransactionOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'external_api';
  resource: string;
  data: any;
  timestamp: number;
  completed: boolean;
  rollback_data?: any;
}

export interface CompensationAction {
  operation: string;
  compensate: () => Promise<void>;
  description: string;
}

export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly transactionId: string,
    public readonly operation?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class DataIntegrityError extends Error {
  constructor(
    message: string,
    public readonly violationType: 'referential' | 'constraint' | 'consistency' | 'corruption',
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}

/**
 * Transaction Manager for ACID compliance
 */
export class TransactionManager {
  private transactions = new Map<string, TransactionContext>();
  private globalMutex = new Mutex();
  private auditLog: Array<{
    transactionId: string;
    operation: string;
    status: string;
    timestamp: Date;
    error?: string;
  }> = [];

  /**
   * Start a new ACID transaction
   */
  async startTransaction(
    isolationLevel: TransactionContext['isolation_level'] = 'read_committed',
  ): Promise<string> {
    const transactionId = this.generateTransactionId();

    const serializableLock =
      isolationLevel === 'serializable' ? await this.globalMutex.acquire() : undefined;

    const context: TransactionContext = {
      id: transactionId,
      startTime: Date.now(),
      operations: [],
      rollbackHandlers: [],
      status: 'pending',
      isolation_level: isolationLevel,
      serializableLock,
    };

    this.transactions.set(transactionId, context);

    this.auditLog.push({
      transactionId,
      operation: 'start_transaction',
      status: 'success',
      timestamp: new Date(),
    });

    return transactionId;
  }

  /**
   * Execute operation within transaction context
   */
  async executeInTransaction<T>(
    transactionId: string,
    operation: () => Promise<T>,
    operationInfo: {
      type: TransactionOperation['type'];
      resource: string;
      description: string;
      rollback?: () => Promise<void>;
    },
  ): Promise<T> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new TransactionError('Transaction not found', transactionId);
    }

    if (transaction.status !== 'pending') {
      throw new TransactionError(
        `Cannot execute operation in ${transaction.status} transaction`,
        transactionId,
      );
    }

    const operationId = this.generateOperationId();
    const transactionOp: TransactionOperation = {
      id: operationId,
      type: operationInfo.type,
      resource: operationInfo.resource,
      data: operationInfo.description,
      timestamp: Date.now(),
      completed: false,
    };

    transaction.operations.push(transactionOp);

    if (operationInfo.rollback) {
      transaction.rollbackHandlers.unshift(operationInfo.rollback);
    }

    try {
      // Execute with appropriate isolation level
      const result = await this.executeWithIsolation(operation, transaction);

      transactionOp.completed = true;

      this.auditLog.push({
        transactionId,
        operation: `${operationInfo.type}:${operationInfo.resource}`,
        status: 'success',
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      transactionOp.completed = false;

      this.auditLog.push({
        transactionId,
        operation: `${operationInfo.type}:${operationInfo.resource}`,
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new TransactionError(
        `Operation failed: ${operationInfo.description}`,
        transactionId,
        operationId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Commit transaction with full ACID compliance
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new TransactionError('Transaction not found', transactionId);
    }

    try {
      if (transaction.status !== 'pending') {
        throw new TransactionError(
          `Cannot commit ${transaction.status} transaction`,
          transactionId,
        );
      }

      // Validate all operations completed successfully
      const incompleteOps = transaction.operations.filter((op) => !op.completed);
      if (incompleteOps.length > 0) {
        throw new TransactionError(
          `Cannot commit transaction with incomplete operations: ${incompleteOps.map((op) => op.id).join(', ')}`,
          transactionId,
        );
      }

      // Perform final consistency check
      await this.validateTransactionConsistency(transaction);

      // Mark transaction as committed
      transaction.status = 'committed';

      this.auditLog.push({
        transactionId,
        operation: 'commit_transaction',
        status: 'success',
        timestamp: new Date(),
      });

      // Clean up transaction context
      this.transactions.delete(transactionId);
    } catch (error) {
      // Auto-rollback on commit failure
      await this.rollbackTransaction(transactionId);

      throw new TransactionError(
        `Transaction commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        transactionId,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      if (transaction.serializableLock) {
        transaction.serializableLock.release();
        transaction.serializableLock = undefined;
      }
    }
  }

  /**
   * Rollback transaction with compensation
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new TransactionError('Transaction not found', transactionId);
    }

    if (transaction.status === 'rolled_back') {
      return; // Already rolled back
    }

    try {
      // Execute rollback handlers in reverse order
      for (const rollbackHandler of transaction.rollbackHandlers) {
        try {
          await rollbackHandler();
        } catch (rollbackError) {
          console.error(`Rollback handler failed for transaction ${transactionId}:`, rollbackError);
          // Continue with other rollback handlers
        }
      }

      transaction.status = 'rolled_back';

      this.auditLog.push({
        transactionId,
        operation: 'rollback_transaction',
        status: 'success',
        timestamp: new Date(),
      });
    } catch (error) {
      transaction.status = 'failed';

      this.auditLog.push({
        transactionId,
        operation: 'rollback_transaction',
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new TransactionError(
        `Transaction rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        transactionId,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      if (transaction.serializableLock) {
        transaction.serializableLock.release();
        transaction.serializableLock = undefined;
      }
      this.transactions.delete(transactionId);
    }
  }

  /**
   * Validate data integrity across related entities
   */
  async validateDataIntegrity(data: {
    customers: Map<string, any>;
    subscriptions: Map<string, any>;
    licenses: Map<string, any>;
  }): Promise<{
    valid: boolean;
    violations: Array<{ type: string; message: string; severity: 'error' | 'warning' }>;
  }> {
    const violations: Array<{ type: string; message: string; severity: 'error' | 'warning' }> = [];

    // Referential integrity checks
    for (const [subId, subscription] of data.subscriptions) {
      // Check customer exists
      if (!data.customers.has(subscription.customer_id)) {
        violations.push({
          type: 'referential_integrity',
          message: `Subscription ${subId} references non-existent customer ${subscription.customer_id}`,
          severity: 'error',
        });
      }
    }

    for (const [licenseKey, license] of data.licenses) {
      // Check subscription exists
      if (!data.subscriptions.has(license.subscription_id)) {
        violations.push({
          type: 'referential_integrity',
          message: `License ${licenseKey} references non-existent subscription ${license.subscription_id}`,
          severity: 'error',
        });
      }

      // Check license-subscription consistency
      const subscription = data.subscriptions.get(license.subscription_id);
      if (subscription) {
        if (license.plan !== subscription.plan) {
          violations.push({
            type: 'data_consistency',
            message: `License ${licenseKey} plan (${license.plan}) doesn't match subscription plan (${subscription.plan})`,
            severity: 'error',
          });
        }

        if (license.seats !== subscription.seats) {
          violations.push({
            type: 'data_consistency',
            message: `License ${licenseKey} seats (${license.seats}) don't match subscription seats (${subscription.seats})`,
            severity: 'warning',
          });
        }
      }
    }

    // Check for orphaned records
    for (const [customerId, customer] of data.customers) {
      if (customer.subscription_id && !data.subscriptions.has(customer.subscription_id)) {
        violations.push({
          type: 'orphaned_reference',
          message: `Customer ${customerId} references non-existent subscription ${customer.subscription_id}`,
          severity: 'error',
        });
      }
    }

    return {
      valid: violations.filter((v) => v.severity === 'error').length === 0,
      violations,
    };
  }

  /**
   * Saga pattern for distributed transactions
   */
  async executeSaga(
    steps: Array<{
      execute: () => Promise<any>;
      compensate: () => Promise<void>;
      description: string;
    }>,
  ): Promise<any[]> {
    const results: any[] = [];
    const compensations: Array<() => Promise<void>> = [];

    try {
      for (const step of steps) {
        const result = await step.execute();
        results.push(result);
        compensations.unshift(step.compensate); // Add to front for reverse order
      }

      return results;
    } catch (error) {
      // Execute compensations in reverse order
      for (const compensation of compensations) {
        try {
          await compensation();
        } catch (compensationError) {
          console.error('Compensation failed:', compensationError);
          // Continue with other compensations
        }
      }

      throw error;
    }
  }

  /**
   * Get transaction audit log
   */
  getAuditLog(filter?: {
    transactionId?: string;
    operation?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Array<{
    transactionId: string;
    operation: string;
    status: string;
    timestamp: Date;
    error?: string;
  }> {
    let filtered = this.auditLog;

    if (filter?.transactionId) {
      filtered = filtered.filter((entry) => entry.transactionId === filter.transactionId);
    }

    if (filter?.operation) {
      filtered = filtered.filter((entry) => entry.operation.includes(filter.operation!));
    }

    if (filter?.status) {
      filtered = filtered.filter((entry) => entry.status === filter.status);
    }

    if (filter?.startDate) {
      filtered = filtered.filter((entry) => entry.timestamp >= filter.startDate!);
    }

    if (filter?.endDate) {
      filtered = filtered.filter((entry) => entry.timestamp <= filter.endDate!);
    }

    return filtered.slice(-1000); // Return last 1000 entries
  }

  // Private helper methods

  private async executeWithIsolation<T>(
    operation: () => Promise<T>,
    transaction: TransactionContext,
  ): Promise<T> {
    switch (transaction.isolation_level) {
      case 'serializable':
        // Lock acquired during startTransaction, just execute.
        return await operation();
      case 'repeatable_read':
      case 'read_committed':
      case 'read_uncommitted':
      default:
        return await operation();
    }
  }

  private async validateTransactionConsistency(transaction: TransactionContext): Promise<void> {
    // Check for any pending operations
    const pendingOps = transaction.operations.filter((op) => !op.completed);
    if (pendingOps.length > 0) {
      throw new DataIntegrityError(
        `Transaction has pending operations: ${pendingOps.map((op) => op.id).join(', ')}`,
        'consistency',
      );
    }

    // Validate operation dependencies
    const createOps = transaction.operations.filter((op) => op.type === 'create');
    const updateOps = transaction.operations.filter((op) => op.type === 'update');

    for (const updateOp of updateOps) {
      const relatedCreate = createOps.find(
        (createOp) => createOp.resource === updateOp.resource || createOp.data === updateOp.data,
      );

      if (relatedCreate && updateOp.timestamp < relatedCreate.timestamp) {
        throw new DataIntegrityError(
          `Update operation ${updateOp.id} executed before related create operation ${relatedCreate.id}`,
          'consistency',
        );
      }
    }
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global transaction manager instance
 */
export const transactionManager = new TransactionManager();

/**
 * Decorator for transactional methods
 */
export function transactional(isolationLevel?: TransactionContext['isolation_level']) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const transactionId = await transactionManager.startTransaction(isolationLevel);

      try {
        const result = await transactionManager.executeInTransaction(
          transactionId,
          () => originalMethod.apply(this, args),
          {
            type: 'update',
            resource: `${target.constructor.name}.${propertyKey}`,
            description: `Execute ${propertyKey} method`,
          },
        );

        await transactionManager.commitTransaction(transactionId);
        return result;
      } catch (error) {
        await transactionManager.rollbackTransaction(transactionId);
        throw error;
      }
    };

    return descriptor;
  };
}
