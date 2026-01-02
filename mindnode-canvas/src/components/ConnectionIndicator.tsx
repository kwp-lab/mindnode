/**
 * Connection Indicator Component
 * 
 * Implements Task 18.2:
 * - Display connection indicator
 * - Show online/offline status
 * 
 * Requirements: 15.3
 */

'use client';

import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Wifi, WifiOff, CheckCircle } from 'lucide-react';

export interface ConnectionIndicatorProps {
  className?: string;
}

/**
 * Displays network connection status
 * Requirements: 15.3 - Display connection status warning
 */
export function ConnectionIndicator({ className = '' }: ConnectionIndicatorProps) {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Don't show anything if online and never was offline
  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg transition-all ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5" />
          <span className="text-sm font-medium">No connection - Working offline</span>
        </>
      )}
    </div>
  );
}

/**
 * Compact connection status icon for toolbar
 */
export function ConnectionStatusIcon({ className = '' }: ConnectionIndicatorProps) {
  const { isOnline } = useNetworkStatus();

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      title={isOnline ? 'Connected' : 'Offline'}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600" />
      )}
    </div>
  );
}
