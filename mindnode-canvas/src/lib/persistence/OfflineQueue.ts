/**
 * Offline Queue with IndexedDB
 * 
 * Implements Task 15.2:
 * - Queue failed operations locally
 * - Retry with exponential backoff
 * - Sync when connection restores
 * 
 * Requirements: 10.4
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================
// TYPES
// ============================================

export type OperationType = 'create' | 'update' | 'delete';
export type EntityType = 'node' | 'workspace';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  entity: EntityType;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface OfflineQueueDB extends DBSchema {
  operations: {
    key: string;
    value: QueuedOperation;
    indexes: {
      'by-timestamp': number;
      'by-entity': string;
    };
  };
}

// ============================================
// CONSTANTS
// ============================================

const DB_NAME = 'mindnode-offline-queue';
const DB_VERSION = 1;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

// ============================================
// OFFLINE QUEUE CLASS
// ============================================

export class OfflineQueue {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;
  private isProcessing = false;
  private onSyncCallback: ((operation: QueuedOperation) => Promise<boolean>) | null = null;
  private onStatusChange: ((pendingCount: number) => void) | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('operations', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-entity', 'entityId');
      },
    });
  }

  /**
   * Set callback for syncing operations
   */
  setOnSync(callback: (operation: QueuedOperation) => Promise<boolean>): void {
    this.onSyncCallback = callback;
  }

  /**
   * Set callback for status changes
   */
  setOnStatusChange(callback: (pendingCount: number) => void): void {
    this.onStatusChange = callback;
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = `${operation.entity}-${operation.entityId}-${Date.now()}`;
    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.db.put('operations', queuedOp);
    this.notifyStatusChange();
    
    return id;
  }

  /**
   * Remove an operation from the queue
   */
  async dequeue(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.delete('operations', id);
    this.notifyStatusChange();
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<QueuedOperation[]> {
    await this.init();
    if (!this.db) return [];

    return this.db.getAllFromIndex('operations', 'by-timestamp');
  }

  /**
   * Get count of pending operations
   */
  async getPendingCount(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return this.db.count('operations');
  }

  /**
   * Update retry count for an operation
   */
  async updateRetryCount(id: string, error?: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const operation = await this.db.get('operations', id);
    if (operation) {
      operation.retryCount += 1;
      operation.lastError = error;
      await this.db.put('operations', operation);
    }
  }

  /**
   * Process all pending operations with exponential backoff
   * Requirements: 10.4 - Retry with exponential backoff
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing || !this.onSyncCallback) {
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let success = 0;
    let failed = 0;

    try {
      const operations = await this.getPendingOperations();

      for (const operation of operations) {
        // Skip if max retries exceeded
        if (operation.retryCount >= MAX_RETRIES) {
          failed++;
          continue;
        }

        // Calculate backoff delay
        const backoffDelay = BASE_BACKOFF_MS * Math.pow(2, operation.retryCount);
        const timeSinceLastAttempt = Date.now() - operation.timestamp;

        // Wait if not enough time has passed
        if (operation.retryCount > 0 && timeSinceLastAttempt < backoffDelay) {
          continue;
        }

        try {
          const syncSuccess = await this.onSyncCallback(operation);
          
          if (syncSuccess) {
            await this.dequeue(operation.id);
            success++;
          } else {
            await this.updateRetryCount(operation.id, 'Sync returned false');
            failed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.updateRetryCount(operation.id, errorMessage);
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
      this.notifyStatusChange();
    }

    return { success, failed };
  }

  /**
   * Clear all operations for a specific entity
   */
  async clearEntityOperations(entityId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const operations = await this.db.getAllFromIndex('operations', 'by-entity', entityId);
    for (const op of operations) {
      await this.db.delete('operations', op.id);
    }
    this.notifyStatusChange();
  }

  /**
   * Clear all operations
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.clear('operations');
    this.notifyStatusChange();
  }

  /**
   * Notify status change callback
   */
  private async notifyStatusChange(): Promise<void> {
    if (this.onStatusChange) {
      const count = await this.getPendingCount();
      this.onStatusChange(count);
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
