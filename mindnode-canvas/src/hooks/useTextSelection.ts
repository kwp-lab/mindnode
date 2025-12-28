'use client';

/**
 * useTextSelection Hook
 * 
 * Detects text selection within mind map nodes and provides position information
 * for displaying the floating toolbar.
 * 
 * Requirements:
 * - 4.1: Detect text selection within a node and display Floating_Toolbar
 * 
 * Implementation:
 * - Uses selectionchange event to detect text selection
 * - Calculates selection position with getBoundingClientRect
 * - Filters selections within node boundaries
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMindNodeStore } from '../store';

// ============================================
// TYPES
// ============================================

export interface TextSelectionState {
  /** The selected text content */
  text: string;
  /** Position for the floating toolbar (screen coordinates) */
  position: { x: number; y: number };
  /** The ID of the node containing the selection */
  nodeId: string;
  /** The bounding rect of the selection */
  rect: DOMRect;
}

export interface UseTextSelectionOptions {
  /** Minimum text length to trigger selection (default: 1) */
  minLength?: number;
  /** Delay before clearing selection after deselect (ms) */
  clearDelay?: number;
  /** Whether to enable selection detection */
  enabled?: boolean;
}

export interface UseTextSelectionReturn {
  /** Current selection state, null if no selection */
  selection: TextSelectionState | null;
  /** Clear the current selection */
  clearSelection: () => void;
  /** Check if a specific node has an active selection */
  hasSelectionInNode: (nodeId: string) => boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MIN_LENGTH = 1;
const DEFAULT_CLEAR_DELAY = 150;
const NODE_DATA_ATTRIBUTE = 'data-node-id';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find the closest node element containing the given element
 */
function findNodeElement(element: Node | null): HTMLElement | null {
  if (!element) return null;
  
  let current: Node | null = element;
  
  while (current) {
    if (current instanceof HTMLElement && current.hasAttribute(NODE_DATA_ATTRIBUTE)) {
      return current;
    }
    current = current.parentNode;
  }
  
  return null;
}

/**
 * Get the node ID from a node element
 */
function getNodeIdFromElement(element: HTMLElement): string | null {
  return element.getAttribute(NODE_DATA_ATTRIBUTE);
}

/**
 * Check if the selection is within a node's content area (not in edit mode textarea)
 */
function isSelectionInViewMode(selection: Selection): boolean {
  const anchorNode = selection.anchorNode;
  if (!anchorNode) return false;
  
  // Check if we're inside a textarea (edit mode)
  let current: Node | null = anchorNode;
  while (current) {
    if (current instanceof HTMLElement) {
      if (current.tagName === 'TEXTAREA' || current.tagName === 'INPUT') {
        return false;
      }
      // Check for node-content test id (view mode content area)
      if (current.getAttribute('data-testid')?.includes('node-content')) {
        return true;
      }
    }
    current = current.parentNode;
  }
  
  return true;
}

/**
 * Calculate the position for the floating toolbar
 * Positions it above the selection, centered horizontally
 */
function calculateToolbarPosition(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top - 10, // Position above the selection
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for detecting and managing text selection within mind map nodes
 * 
 * @param options - Configuration options
 * @returns Selection state and control functions
 */
export function useTextSelection(
  options: UseTextSelectionOptions = {}
): UseTextSelectionReturn {
  const {
    minLength = DEFAULT_MIN_LENGTH,
    clearDelay = DEFAULT_CLEAR_DELAY,
    enabled = true,
  } = options;

  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get store actions for syncing selection state
  const { setSelection: setStoreSelection, clearSelection: clearStoreSelection } = useMindNodeStore();

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    setSelection(null);
    clearStoreSelection();
  }, [clearStoreSelection]);

  /**
   * Handle selection change events
   */
  const handleSelectionChange = useCallback(() => {
    if (!enabled) return;

    const windowSelection = window.getSelection();
    
    // No selection or collapsed (just a cursor)
    if (!windowSelection || windowSelection.isCollapsed) {
      // Delay clearing to allow for click events on toolbar
      if (selection) {
        clearTimeoutRef.current = setTimeout(() => {
          clearSelection();
        }, clearDelay);
      }
      return;
    }

    const selectedText = windowSelection.toString().trim();
    
    // Check minimum length
    if (selectedText.length < minLength) {
      return;
    }

    // Check if selection is in view mode (not in textarea)
    if (!isSelectionInViewMode(windowSelection)) {
      return;
    }

    // Find the node element containing the selection
    const anchorNode = windowSelection.anchorNode;
    const focusNode = windowSelection.focusNode;
    
    const anchorNodeElement = findNodeElement(anchorNode);
    const focusNodeElement = findNodeElement(focusNode);
    
    // Selection must be within a single node
    if (!anchorNodeElement || !focusNodeElement || anchorNodeElement !== focusNodeElement) {
      return;
    }

    const nodeId = getNodeIdFromElement(anchorNodeElement);
    if (!nodeId) {
      return;
    }

    // Get the selection range and bounding rect
    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Calculate toolbar position
    const position = calculateToolbarPosition(rect);

    // Clear any pending clear timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    // Update local state
    const newSelection: TextSelectionState = {
      text: selectedText,
      position,
      nodeId,
      rect,
    };
    
    setSelection(newSelection);
    
    // Sync to store
    setStoreSelection(selectedText, position, nodeId);
  }, [enabled, minLength, clearDelay, selection, clearSelection, setStoreSelection]);

  /**
   * Check if a specific node has an active selection
   */
  const hasSelectionInNode = useCallback(
    (nodeId: string): boolean => {
      return selection?.nodeId === nodeId;
    },
    [selection]
  );

  // Set up selection change listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [enabled, handleSelectionChange]);

  // Clear selection when disabled
  useEffect(() => {
    if (!enabled && selection) {
      clearSelection();
    }
  }, [enabled, selection, clearSelection]);

  return {
    selection,
    clearSelection,
    hasSelectionInNode,
  };
}

export default useTextSelection;
