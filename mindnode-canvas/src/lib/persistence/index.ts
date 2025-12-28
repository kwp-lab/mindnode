/**
 * Data Persistence and Synchronization Module
 * 
 * Implements:
 * - Task 15.1: Real-time node persistence with debouncing and batching
 * - Task 15.2: Offline queue with IndexedDB
 * - Task 15.3: Sync status indicator
 * 
 * Requirements:
 * - 10.1: Save node to database within 2 seconds
 * - 10.2: Update database with new coordinates
 * - 10.4: Queue changes locally and sync when connection restores
 * - 10.5: Display sync status indicator
 */

export { PersistenceManager, type PersistenceConfig } from './PersistenceManager';
export { OfflineQueue, type QueuedOperation, type OperationType } from './OfflineQueue';
export { 
  SyncStatus, 
  type SyncState, 
  type SyncStatusType,
  useSyncStatus 
} from './SyncStatus';
export { usePersistence, type UsePersistenceReturn } from './usePersistence';
