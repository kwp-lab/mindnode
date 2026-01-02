/**
 * Loading States Components
 * 
 * Implements Task 20.2:
 * - Skeleton loaders for various components
 * - Smooth transitions for layout changes
 * - Improved perceived performance
 * 
 * Requirements: 13.3 - Provide immediate visual feedback within 100ms
 */

'use client';

import React from 'react';

// ============================================
// SKELETON COMPONENTS
// ============================================

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ 
  className = '',
  animate = true,
}: { 
  className?: string;
  animate?: boolean;
}) {
  return (
    <div 
      className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton loader for a single node
 * Requirements: 13.3 - Visual feedback during loading
 */
export function NodeSkeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`rounded-lg border-2 border-gray-200 bg-white p-4 min-w-[280px] max-w-[320px] min-h-[100px] shadow-sm ${className}`}
      aria-label="Loading node"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for workspace sidebar item
 */
export function WorkspaceItemSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for workspace sidebar
 */
export function WorkspaceSidebarSkeleton() {
  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header skeleton */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      
      {/* List skeleton */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <WorkspaceItemSkeleton />
        <WorkspaceItemSkeleton />
        <WorkspaceItemSkeleton />
      </div>
      
      {/* Footer skeleton */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <Skeleton className="h-4 w-20 mx-auto" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the canvas area
 */
export function CanvasSkeleton() {
  return (
    <div className="w-full h-full bg-gray-50 flex items-center justify-center relative overflow-hidden">
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Center loading indicator */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-gray-500 font-medium">Loading canvas...</span>
      </div>
      
      {/* Floating node skeletons */}
      <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 opacity-50">
        <NodeSkeleton />
      </div>
      <div className="absolute top-1/3 right-1/3 transform translate-x-1/2 opacity-30">
        <NodeSkeleton />
      </div>
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="w-screen h-screen overflow-hidden flex">
      {/* Sidebar skeleton */}
      <div className="w-64 flex-shrink-0">
        <WorkspaceSidebarSkeleton />
      </div>
      
      {/* Main area skeleton */}
      <div className="flex-1 relative">
        {/* Toolbar skeleton */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        
        {/* Canvas skeleton */}
        <CanvasSkeleton />
      </div>
    </div>
  );
}

// ============================================
// TRANSITION COMPONENTS
// ============================================

/**
 * Fade transition wrapper
 * Requirements: 13.3 - Smooth transitions
 */
export function FadeTransition({
  show,
  children,
  duration = 200,
  className = '',
}: {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Slide transition wrapper
 * Requirements: 13.3 - Smooth transitions for layout changes
 */
export function SlideTransition({
  show,
  children,
  direction = 'left',
  duration = 300,
  className = '',
}: {
  show: boolean;
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  className?: string;
}) {
  const transforms = {
    left: show ? 'translateX(0)' : 'translateX(-100%)',
    right: show ? 'translateX(0)' : 'translateX(100%)',
    up: show ? 'translateY(0)' : 'translateY(-100%)',
    down: show ? 'translateY(0)' : 'translateY(100%)',
  };

  return (
    <div
      className={`transition-transform ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transform: transforms[direction],
      }}
    >
      {children}
    </div>
  );
}

/**
 * Scale transition wrapper for nodes
 * Requirements: 13.3 - Smooth transitions
 */
export function ScaleTransition({
  show,
  children,
  duration = 200,
  className = '',
}: {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`transition-all ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transform: show ? 'scale(1)' : 'scale(0.95)',
        opacity: show ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// LOADING OVERLAY
// ============================================

/**
 * Loading overlay with spinner
 * Requirements: 13.3 - Visual feedback during operations
 */
export function LoadingOverlay({
  show,
  message = 'Loading...',
  className = '',
}: {
  show: boolean;
  message?: string;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div 
      className={`absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-3" />
        <span className="text-sm text-gray-600 font-medium">{message}</span>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function Spinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div 
      className={`${sizes[size]} border-gray-300 border-t-blue-500 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

// ============================================
// PROGRESS INDICATOR
// ============================================

/**
 * Progress bar for operations
 */
export function ProgressBar({
  progress,
  className = '',
  showPercentage = false,
}: {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-500 mt-1 block text-right">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}

/**
 * Indeterminate progress bar
 */
export function IndeterminateProgress({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-1 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full bg-blue-500 rounded-full animate-indeterminate"
        style={{
          width: '30%',
          animation: 'indeterminate 1.5s infinite ease-in-out',
        }}
      />
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}

export default {
  Skeleton,
  NodeSkeleton,
  WorkspaceItemSkeleton,
  WorkspaceSidebarSkeleton,
  CanvasSkeleton,
  PageSkeleton,
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  LoadingOverlay,
  Spinner,
  ProgressBar,
  IndeterminateProgress,
};
