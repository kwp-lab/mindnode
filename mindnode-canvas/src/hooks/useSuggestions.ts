'use client';

/**
 * useSuggestions Hook
 * 
 * Custom hook for fetching AI-generated suggestions for nodes.
 * Handles async fetching and caching of suggestions.
 * 
 * Requirements:
 * - 6.1: Generate 3 suggestion prompts after AI node completes
 * - 6.2: Analyze current node content and full context path
 */

import { useCallback, useState, useRef } from 'react';
import { useMindNodeStore } from '../store';
import { assembleContextFromArray } from '../lib/context';

// ============================================
// TYPES
// ============================================

export interface UseSuggestionsOptions {
  /** Callback when suggestions are fetched */
  onFetch?: (nodeId: string, suggestions: string[]) => void;
  /** Callback when an error occurs */
  onError?: (nodeId: string, error: Error) => void;
}

export interface UseSuggestionsReturn {
  /** Fetch suggestions for a node */
  fetchSuggestions: (nodeId: string) => Promise<string[]>;
  /** Get cached suggestions for a node */
  getSuggestions: (nodeId: string) => string[] | null;
  /** Check if suggestions are loading for a node */
  isLoading: (nodeId: string) => boolean;
  /** Clear suggestions for a node */
  clearSuggestions: (nodeId: string) => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for fetching and managing AI suggestions
 * 
 * Requirements:
 * - 6.1: Generate 3 suggestion prompts
 * - 6.2: Use context path for intelligent suggestions
 */
export function useSuggestions(options: UseSuggestionsOptions = {}): UseSuggestionsReturn {
  const { onFetch, onError } = options;
  
  // Store access
  const { nodes, updateNode } = useMindNodeStore();
  
  // Track loading state per node
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  
  // Cache suggestions per node
  const suggestionsCache = useRef<Map<string, string[]>>(new Map());

  /**
   * Fetch suggestions for a node
   * Requirements: 6.1, 6.2 - Generate suggestions using context
   */
  const fetchSuggestions = useCallback(async (nodeId: string): Promise<string[]> => {
    // Mark as loading
    setLoadingNodes(prev => new Set([...prev, nodeId]));
    
    try {
      // Get the node
      const node = nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }
      
      // Assemble context path
      const contextPath = assembleContextFromArray(nodeId, nodes);
      
      // Fetch suggestions from API
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId,
          nodeContent: node.data.contextContent || node.data.label,
          contextPath,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const suggestions = data.suggestions || [];
      
      // Cache suggestions
      suggestionsCache.current.set(nodeId, suggestions);
      
      // Update node with suggestions
      updateNode(nodeId, { suggestions });
      
      // Callback
      onFetch?.(nodeId, suggestions);
      
      return suggestions;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(nodeId, err);
      
      // Return fallback suggestions on error
      const fallback = ['Tell me more?', 'Why is that?', 'What else?'];
      suggestionsCache.current.set(nodeId, fallback);
      updateNode(nodeId, { suggestions: fallback });
      
      return fallback;
      
    } finally {
      // Clear loading state
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [nodes, updateNode, onFetch, onError]);

  /**
   * Get cached suggestions for a node
   */
  const getSuggestions = useCallback((nodeId: string): string[] | null => {
    return suggestionsCache.current.get(nodeId) || null;
  }, []);

  /**
   * Check if suggestions are loading for a node
   */
  const isLoading = useCallback((nodeId: string): boolean => {
    return loadingNodes.has(nodeId);
  }, [loadingNodes]);

  /**
   * Clear suggestions for a node
   */
  const clearSuggestions = useCallback((nodeId: string) => {
    suggestionsCache.current.delete(nodeId);
    updateNode(nodeId, { suggestions: undefined });
  }, [updateNode]);

  return {
    fetchSuggestions,
    getSuggestions,
    isLoading,
    clearSuggestions,
  };
}

export default useSuggestions;
