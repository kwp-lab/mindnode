/**
 * Sync Status Management
 * 
 * Implements Task 15.3:
 * - Display synced/syncing/error states
 * - Show connection status
 * 
 * Requirements: 10.5
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export type SyncStatusType = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatusType;
  pendingCount: number;
  lastSyncTime: Date | null;
  lastError: string | null;
  isOnline: boolean;
}

// ============================================
// SYNC STATUS CLASS
// ============================================

export class SyncStatus {
  private state: SyncState = {
    status: 'synced',
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  private listeners: Set<(state: SyncState) => void> = new Set();

  constructor() {
    // Set up online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Get current state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.updateState({ 
      isOnline: true,
      status: this.state.pendingCount > 0 ? 'pending' : 'synced'
    });
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.updateState({ 
      isOnline: false,
      status: 'offline'
    });
  };

  /**
   * Set syncing status
   */
  setSyncing(): void {
    if (!this.state.isOnline) return;
    this.updateState({ status: 'syncing' });
  }

  /**
   * Set synced status
   */
  setSynced(): void {
    this.updateState({ 
      status: this.state.isOnline ? 'synced' : 'offline',
      lastSyncTime: new Date(),
      lastError: null
    });
  }

  /**
   * Set pending status with count
   */
  setPending(count: number): void {
    this.updateState({ 
      pendingCount: count,
      status: count > 0 
        ? (this.state.isOnline ? 'pending' : 'offline')
        : (this.state.isOnline ? 'synced' : 'offline')
    });
  }

  /**
   * Set error status
   */
  setError(error: string): void {
    this.updateState({ 
      status: 'error',
      lastError: error
    });
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const syncStatus = new SyncStatus();

// ============================================
// REACT HOOK
// ============================================

/**
 * React hook for sync status
 * Requirements: 10.5 - Display sync status indicator
 */
export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(syncStatus.getState());

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = syncStatus.subscribe(setState);
    
    // Get initial state
    setState(syncStatus.getState());

    return unsubscribe;
  }, []);

  return state;
}
