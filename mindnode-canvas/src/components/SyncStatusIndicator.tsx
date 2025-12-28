/**
 * Sync Status Indicator Component
 * 
 * Implements Task 15.3:
 * - Display synced/syncing/error states
 * - Show connection status
 * 
 * Requirements: 10.5
 */

'use client';

import React from 'react';
import { useSyncStatus, SyncStatusType } from '../lib/persistence';

// ============================================
// TYPES
// ============================================

export interface SyncStatusIndicatorProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed status text */
  showText?: boolean;
  /** Whether to show pending count */
  showPendingCount?: boolean;
}

// ============================================
// STATUS CONFIG
// ============================================

interface StatusConfig {
  icon: React.ReactNode;
  text: string;
  color: string;
  bgColor: string;
  animate?: boolean;
}

const STATUS_CONFIG: Record<SyncStatusType, StatusConfig> = {
  synced: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    text: 'Saved',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  syncing: {
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    text: 'Saving...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    animate: true,
  },
  pending: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    text: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  error: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    text: 'Error',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  offline: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
      </svg>
    ),
    text: 'Offline',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

// ============================================
// COMPONENT
// ============================================

export function SyncStatusIndicator({
  className = '',
  showText = true,
  showPendingCount = true,
}: SyncStatusIndicatorProps) {
  const syncState = useSyncStatus();
  const config = STATUS_CONFIG[syncState.status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color} ${className}`}
      title={syncState.lastError || config.text}
      data-testid="sync-status-indicator"
      data-status={syncState.status}
    >
      {/* Icon */}
      <span className={config.animate ? 'animate-pulse' : ''}>
        {config.icon}
      </span>

      {/* Text */}
      {showText && (
        <span className="text-sm font-medium">
          {config.text}
        </span>
      )}

      {/* Pending count */}
      {showPendingCount && syncState.pendingCount > 0 && (
        <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded-full">
          {syncState.pendingCount}
        </span>
      )}

      {/* Connection indicator */}
      {!syncState.isOnline && (
        <span className="w-2 h-2 rounded-full bg-red-500" title="No internet connection" />
      )}
    </div>
  );
}

// ============================================
// COMPACT VARIANT
// ============================================

export function SyncStatusDot({
  className = '',
}: {
  className?: string;
}) {
  const syncState = useSyncStatus();

  const dotColors: Record<SyncStatusType, string> = {
    synced: 'bg-green-500',
    syncing: 'bg-blue-500 animate-pulse',
    pending: 'bg-yellow-500',
    error: 'bg-red-500',
    offline: 'bg-gray-500',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${dotColors[syncState.status]} ${className}`}
      title={STATUS_CONFIG[syncState.status].text}
      data-testid="sync-status-dot"
      data-status={syncState.status}
    />
  );
}

export default SyncStatusIndicator;
