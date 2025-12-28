'use client';

/**
 * SelectionToolbar Component
 * 
 * A floating toolbar that appears when text is selected within a node.
 * Provides an "AI Branch" button to create a child node with the selected text as context.
 * 
 * Requirements:
 * - 4.1: Display Floating_Toolbar near the selection
 * - 4.2: Provide "AI Branch" action button
 * - 4.5: Disappear after a brief delay when text is deselected
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface SelectionToolbarProps {
  /** The selected text content */
  selectedText: string;
  /** Position for the toolbar (screen coordinates) */
  position: { x: number; y: number };
  /** Callback when "AI Branch" button is clicked */
  onCreateBranch: (text: string) => void;
  /** Callback when toolbar should be dismissed */
  onDismiss: () => void;
  /** Whether the toolbar is visible */
  visible?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const TOOLBAR_WIDTH = 120;
const TOOLBAR_HEIGHT = 40;
const TOOLBAR_OFFSET_Y = 8;
const ANIMATION_DURATION = 150;

// ============================================
// COMPONENT
// ============================================

/**
 * SelectionToolbar - Floating toolbar for text selection actions
 */
export function SelectionToolbar({
  selectedText,
  position,
  onCreateBranch,
  onDismiss,
  visible = true,
}: SelectionToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  /**
   * Handle click on "AI Branch" button
   */
  const handleCreateBranch = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onCreateBranch(selectedText);
    },
    [selectedText, onCreateBranch]
  );

  /**
   * Handle click outside the toolbar to dismiss
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        // Small delay to allow button click to register
        setTimeout(() => {
          onDismiss();
        }, 50);
      }
    };

    // Handle escape key to dismiss
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    if (visible) {
      // Delay adding listeners to prevent immediate dismissal
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [visible, onDismiss]);

  /**
   * Adjust position to keep toolbar within viewport
   */
  useEffect(() => {
    if (!visible) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x - TOOLBAR_WIDTH / 2;
    let y = position.y - TOOLBAR_HEIGHT - TOOLBAR_OFFSET_Y;

    // Keep within horizontal bounds
    if (x < 10) {
      x = 10;
    } else if (x + TOOLBAR_WIDTH > viewportWidth - 10) {
      x = viewportWidth - TOOLBAR_WIDTH - 10;
    }

    // If toolbar would be above viewport, position below selection
    if (y < 10) {
      y = position.y + TOOLBAR_OFFSET_Y + 20; // Below selection
    }

    // Keep within vertical bounds
    if (y + TOOLBAR_HEIGHT > viewportHeight - 10) {
      y = viewportHeight - TOOLBAR_HEIGHT - 10;
    }

    setAdjustedPosition({ x, y });
  }, [position, visible]);

  /**
   * Animate in when becoming visible
   */
  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      const timeoutId = setTimeout(() => {
        setIsAnimating(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timeoutId);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={`
        fixed z-50 flex items-center gap-1 px-2 py-1.5
        bg-white rounded-lg shadow-lg border border-gray-200
        transition-all duration-150 ease-out
        ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
      `}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        minWidth: TOOLBAR_WIDTH,
      }}
      data-testid="selection-toolbar"
      role="toolbar"
      aria-label="Text selection actions"
    >
      {/* AI Branch Button */}
      <button
        onClick={handleCreateBranch}
        className={`
          flex items-center gap-1.5 px-3 py-1.5
          text-sm font-medium text-white
          bg-gradient-to-r from-emerald-500 to-teal-500
          hover:from-emerald-600 hover:to-teal-600
          rounded-md shadow-sm
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1
        `}
        data-testid="ai-branch-button"
        aria-label="Create AI branch from selected text"
      >
        <span className="text-base" aria-hidden="true">🤖</span>
        <span>AI Branch</span>
      </button>

      {/* Tooltip arrow pointing down to selection */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2
          w-0 h-0
          border-l-[6px] border-l-transparent
          border-r-[6px] border-r-transparent
          border-t-[6px] border-t-white
          ${position.y > adjustedPosition.y + TOOLBAR_HEIGHT ? 'top-full -mt-px' : 'bottom-full rotate-180 -mb-px'}
        `}
        style={{
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
        }}
      />
    </div>
  );
}

export default SelectionToolbar;
