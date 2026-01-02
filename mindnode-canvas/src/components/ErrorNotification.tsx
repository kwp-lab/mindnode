/**
 * Error Notification Component
 * 
 * Implements Task 18.3:
 * - Display user-friendly error messages
 * 
 * Requirements: 15.2
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { DatabaseError, databaseErrorHandler } from '../lib/errors';

export interface ErrorNotificationProps {
  className?: string;
  autoHideDuration?: number;
}

interface ErrorState {
  error: DatabaseError | null;
  visible: boolean;
}

/**
 * Displays database error notifications with retry option
 * Requirements: 15.2 - Display user-friendly error messages
 */
export function ErrorNotification({ 
  className = '',
  autoHideDuration = 5000,
}: ErrorNotificationProps) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    visible: false,
  });

  useEffect(() => {
    // Subscribe to database errors
    const unsubscribe = databaseErrorHandler.onError((error) => {
      setErrorState({
        error,
        visible: true,
      });

      // Auto-hide after duration (unless it's a non-retryable error)
      if (error.retryable && autoHideDuration > 0) {
        setTimeout(() => {
          setErrorState(prev => ({ ...prev, visible: false }));
        }, autoHideDuration);
      }
    });

    return unsubscribe;
  }, [autoHideDuration]);

  const handleDismiss = () => {
    setErrorState(prev => ({ ...prev, visible: false }));
  };

  const handleRetry = () => {
    // Dismiss the error and let the user retry manually
    handleDismiss();
    // In a real implementation, you might want to trigger a retry here
    window.location.reload();
  };

  if (!errorState.visible || !errorState.error) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md rounded-lg bg-red-50 border border-red-200 shadow-lg ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3 p-4">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            Error
          </h3>
          <p className="text-sm text-red-800">
            {errorState.error.userMessage}
          </p>
          
          {errorState.error.retryable && (
            <button
              onClick={handleRetry}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Inline error display for forms and inputs
 */
export interface InlineErrorProps {
  error: string | null;
  className?: string;
}

export function InlineError({ error, className = '' }: InlineErrorProps) {
  if (!error) return null;

  return (
    <div
      className={`flex items-center gap-2 text-sm text-red-600 mt-1 ${className}`}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}
