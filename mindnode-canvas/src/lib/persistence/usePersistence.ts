/**
 * usePersistence Hook
 * 
 * React hook for data persistence with debouncing and offline support
 * 
 * Implements:
 * - Task 15.1: Real-time node persistence
 * - Task 15.2: Offline queue integration
 * 
 * Requirements: 10.1, 10.2, 10.4
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { MindNode } from '../../types';
import { persistenceManager } from './PersistenceManager';
import { offlineQueue } from './OfflineQueue';
import { useSyncStatus, SyncState } from './SyncStatus';

// ============================================
// TYPES
// ============================================

export interface UsePersistenceReturn {
  /** Current sync status */
  syncState: SyncState;
  /** Queue a node update (debounced) */
  queueNodeUpdate: (nodeId: string, data: Partial<MindNode>) => void;
  /** Queue a position update (debounced) */
  queuePositionUpdate: (nodeId: string, position: { x: number; y: number }) => void;
  /** Queue a content update (debounced) */
  queueContentUpdate: (nodeId: string, content: string) => void;
  /** Create a new node (immediate with optimistic update) */
  createNode: (node: MindNode) => Promise<boolean>;
  /** Delete a node (immediate with optimistic update) */
  deleteNode: (nodeId: string) => Promise<boolean>;
  /** Flush all pending updates immediately */
  flushAll: () => Promise<void>;
  /** Process offline queue */
  processOfflineQueue: () => Promise<void>;
}

// ============================================
// HOOK
// ============================================

export function usePersistence(): UsePersistenceReturn {
  const syncState = useSyncStatus();
  const isInitialized = useRef(false);

  // Initialize offline queue on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      offlineQueue.init().catch(console.error);
    }

    // Cleanup on unmount
    return () => {
      // Flush pending updates before unmount
      persistenceManager.flushAll().catch(console.error);
    };
  }, []);

  /**
   * Queue a node update with debouncing
   * Requirements: 10.1 - Save node to database within 2 seconds
   */
  const queueNodeUpdate = useCallback((nodeId: string, data: Partial<MindNode>) => {
    persistenceManager.queueNodeUpdate(nodeId, data);
  }, []);

  /**
   * Queue a position update
   * Requirements: 10.2 - Update database with new coordinates
   */
  const queuePositionUpdate = useCallback((nodeId: string, position: { x: number; y: number }) => {
    persistenceManager.queuePositionUpdate(nodeId, position);
  }, []);

  /**
   * Queue a content update
   */
  const queueContentUpdate = useCallback((nodeId: string, content: string) => {
    persistenceManager.queueContentUpdate(nodeId, content);
  }, []);

  /**
   * Create a new node with optimistic update
   */
  const createNode = useCallback(async (node: MindNode): Promise<boolean> => {
    return persistenceManager.createNode(node);
  }, []);

  /**
   * Delete a node with optimistic update
   */
  const deleteNode = useCallback(async (nodeId: string): Promise<boolean> => {
    return persistenceManager.deleteNode(nodeId);
  }, []);

  /**
   * Flush all pending updates immediately
   */
  const flushAll = useCallback(async () => {
    await persistenceManager.flushAll();
  }, []);

  /**
   * Process offline queue
   * Requirements: 10.4 - Sync when connection restores
   */
  const processOfflineQueue = useCallback(async () => {
    await persistenceManager.processOfflineQueue();
  }, []);

  return {
    syncState,
    queueNodeUpdate,
    queuePositionUpdate,
    queueContentUpdate,
    createNode,
    deleteNode,
    flushAll,
    processOfflineQueue,
  };
}
