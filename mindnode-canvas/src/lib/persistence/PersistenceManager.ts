/**
 * Persistence Manager
 * 
 * Implements Task 15.1:
 * - Debounce node updates (2 second delay)
 * - Batch multiple updates into single transaction
 * - Use optimistic updates for UI responsiveness
 * 
 * Requirements: 10.1, 10.2
 */

import { MindNode } from '../../types';
import { offlineQueue, QueuedOperation } from './OfflineQueue';
import { syncStatus } from './SyncStatus';

// ============================================
// TYPES
// ============================================

export interface PersistenceConfig {
  debounceMs: number;
  batchIntervalMs: number;
  apiBaseUrl: string;
}

interface PendingUpdate {
  nodeId: string;
  data: Partial<MindNode>;
  timestamp: number;
}

interface BatchedUpdate {
  nodeId: string;
  data: Partial<MindNode>;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG: PersistenceConfig = {
  debounceMs: 2000, // 2 second debounce as per requirements
  batchIntervalMs: 500, // Batch updates every 500ms
  apiBaseUrl: '/api',
};

// ============================================
// PERSISTENCE MANAGER CLASS
// ============================================

export class PersistenceManager {
  private config: PersistenceConfig;
  private pendingUpdates: Map<string, PendingUpdate> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessingBatch = false;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupOfflineQueue();
  }

  /**
   * Setup offline queue sync callback
   */
  private setupOfflineQueue(): void {
    offlineQueue.setOnSync(async (operation) => {
      return this.syncOperation(operation);
    });

    offlineQueue.setOnStatusChange((count) => {
      syncStatus.setPending(count);
    });

    // Listen for online events to trigger sync
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processOfflineQueue();
      });
    }
  }

  /**
   * Sync a single operation to the server
   */
  private async syncOperation(operation: QueuedOperation): Promise<boolean> {
    const { type, entity, entityId, data } = operation;

    try {
      let response: Response;

      if (entity === 'node') {
        switch (type) {
          case 'create':
            response = await fetch(`${this.config.apiBaseUrl}/nodes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            break;
          case 'update':
            response = await fetch(`${this.config.apiBaseUrl}/nodes/${entityId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            break;
          case 'delete':
            response = await fetch(`${this.config.apiBaseUrl}/nodes/${entityId}`, {
              method: 'DELETE',
            });
            break;
          default:
            return false;
        }
      } else {
        // Handle workspace operations
        switch (type) {
          case 'update':
            response = await fetch(`${this.config.apiBaseUrl}/workspaces/${entityId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            break;
          default:
            return false;
        }
      }

      return response.ok;
    } catch (error) {
      console.error('Sync operation failed:', error);
      return false;
    }
  }

  /**
   * Process offline queue
   */
  async processOfflineQueue(): Promise<void> {
    if (!navigator.onLine) return;

    syncStatus.setSyncing();
    const result = await offlineQueue.processQueue();
    
    if (result.failed === 0) {
      syncStatus.setSynced();
    } else {
      syncStatus.setError(`${result.failed} operations failed to sync`);
    }
  }

  /**
   * Queue a node update with debouncing
   * Requirements: 10.1 - Save node to database within 2 seconds
   */
  queueNodeUpdate(nodeId: string, data: Partial<MindNode>): void {
    // Clear existing debounce timer for this node
    const existingTimer = this.debounceTimers.get(nodeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending update (merge with existing if any)
    const existing = this.pendingUpdates.get(nodeId);
    const mergedData = existing 
      ? { ...existing.data, ...data }
      : data;

    this.pendingUpdates.set(nodeId, {
      nodeId,
      data: mergedData,
      timestamp: Date.now(),
    });

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.flushNodeUpdate(nodeId);
    }, this.config.debounceMs);

    this.debounceTimers.set(nodeId, timer);

    // Start batch timer if not already running
    this.startBatchTimer();
  }

  /**
   * Queue a node position update
   * Requirements: 10.2 - Update database with new coordinates
   */
  queuePositionUpdate(nodeId: string, position: { x: number; y: number }): void {
    this.queueNodeUpdate(nodeId, { position } as Partial<MindNode>);
  }

  /**
   * Queue a node content update
   */
  queueContentUpdate(nodeId: string, content: string): void {
    this.queueNodeUpdate(nodeId, { 
      data: { 
        label: content, 
        contextContent: content 
      } 
    } as unknown as Partial<MindNode>);
  }

  /**
   * Flush a specific node update immediately
   */
  private async flushNodeUpdate(nodeId: string): Promise<void> {
    const update = this.pendingUpdates.get(nodeId);
    if (!update) return;

    // Remove from pending
    this.pendingUpdates.delete(nodeId);
    this.debounceTimers.delete(nodeId);

    // Add to batch
    await this.persistUpdate(update);
  }

  /**
   * Start batch timer for processing updates
   */
  private startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Process batched updates
   * Requirements: 10.1 - Batch multiple updates into single transaction
   */
  private async processBatch(): Promise<void> {
    this.batchTimer = null;

    if (this.isProcessingBatch || this.pendingUpdates.size === 0) return;

    this.isProcessingBatch = true;
    syncStatus.setSyncing();

    try {
      // Get all updates that have passed their debounce time
      const now = Date.now();
      const readyUpdates: BatchedUpdate[] = [];

      for (const [nodeId, update] of this.pendingUpdates) {
        if (now - update.timestamp >= this.config.debounceMs) {
          readyUpdates.push({ nodeId, data: update.data });
          this.pendingUpdates.delete(nodeId);
          
          const timer = this.debounceTimers.get(nodeId);
          if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(nodeId);
          }
        }
      }

      if (readyUpdates.length > 0) {
        await this.persistBatch(readyUpdates);
      }

      // Check if more updates are pending
      if (this.pendingUpdates.size > 0) {
        this.startBatchTimer();
      } else {
        syncStatus.setSynced();
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      syncStatus.setError('Failed to sync changes');
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Persist a single update
   */
  private async persistUpdate(update: PendingUpdate): Promise<void> {
    if (!navigator.onLine) {
      // Queue for offline sync
      await offlineQueue.enqueue({
        type: 'update',
        entity: 'node',
        entityId: update.nodeId,
        data: update.data as Record<string, unknown>,
      });
      return;
    }

    syncStatus.setSyncing();

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/nodes/${update.nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update.data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      syncStatus.setSynced();
    } catch (error) {
      console.error('Failed to persist update:', error);
      
      // Queue for retry
      await offlineQueue.enqueue({
        type: 'update',
        entity: 'node',
        entityId: update.nodeId,
        data: update.data as Record<string, unknown>,
      });
      
      syncStatus.setError('Failed to save changes');
    }
  }

  /**
   * Persist a batch of updates
   */
  private async persistBatch(updates: BatchedUpdate[]): Promise<void> {
    if (!navigator.onLine) {
      // Queue all for offline sync
      for (const update of updates) {
        await offlineQueue.enqueue({
          type: 'update',
          entity: 'node',
          entityId: update.nodeId,
          data: update.data as Record<string, unknown>,
        });
      }
      return;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/nodes/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Batch persist failed, falling back to individual updates:', error);
      
      // Fall back to individual updates
      for (const update of updates) {
        await this.persistUpdate({
          nodeId: update.nodeId,
          data: update.data,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Create a new node with optimistic update
   */
  async createNode(node: MindNode): Promise<boolean> {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'create',
        entity: 'node',
        entityId: node.id,
        data: node as unknown as Record<string, unknown>,
      });
      return true; // Optimistic success
    }

    syncStatus.setSyncing();

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      syncStatus.setSynced();
      return true;
    } catch (error) {
      console.error('Failed to create node:', error);
      
      await offlineQueue.enqueue({
        type: 'create',
        entity: 'node',
        entityId: node.id,
        data: node as unknown as Record<string, unknown>,
      });
      
      syncStatus.setError('Failed to create node');
      return true; // Still return true for optimistic update
    }
  }

  /**
   * Delete a node with optimistic update
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    // Clear any pending updates for this node
    this.pendingUpdates.delete(nodeId);
    const timer = this.debounceTimers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(nodeId);
    }

    // Clear offline queue operations for this node
    await offlineQueue.clearEntityOperations(nodeId);

    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'delete',
        entity: 'node',
        entityId: nodeId,
        data: {},
      });
      return true;
    }

    syncStatus.setSyncing();

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/nodes/${nodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      syncStatus.setSynced();
      return true;
    } catch (error) {
      console.error('Failed to delete node:', error);
      
      await offlineQueue.enqueue({
        type: 'delete',
        entity: 'node',
        entityId: nodeId,
        data: {},
      });
      
      syncStatus.setError('Failed to delete node');
      return true;
    }
  }

  /**
   * Flush all pending updates immediately
   */
  async flushAll(): Promise<void> {
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Persist all pending updates
    const updates = Array.from(this.pendingUpdates.values());
    this.pendingUpdates.clear();

    if (updates.length > 0) {
      await this.persistBatch(updates.map(u => ({ nodeId: u.nodeId, data: u.data })));
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingUpdates.clear();
  }
}

// Singleton instance
export const persistenceManager = new PersistenceManager();
