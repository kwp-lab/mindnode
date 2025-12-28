/**
 * useAIGeneration Hook
 * 
 * Custom hook for AI generation with streaming support using Vercel AI SDK.
 * Handles streaming token updates and real-time node content updates.
 * 
 * Requirements:
 * - 3.3: Stream AI output in real-time to the node
 */

'use client';

import { useCallback, useState, useRef } from 'react';
import { useMindNodeStore } from '../store';
import { assembleContextFromArray } from '../lib/context';
import { AIError } from '../types';

// ============================================
// TYPES
// ============================================

export interface UseAIGenerationOptions {
  /** Callback when generation starts */
  onStart?: (nodeId: string) => void;
  /** Callback when generation completes */
  onComplete?: (nodeId: string, content: string) => void;
  /** Callback when an error occurs */
  onError?: (nodeId: string, error: AIError) => void;
}

export interface UseAIGenerationReturn {
  /** Generate AI response for a node */
  generate: (nodeId: string, selectionSource?: string, userMessage?: string) => Promise<void>;
  /** Stop ongoing generation for a node */
  stop: (nodeId: string) => void;
  /** Check if a specific node is generating */
  isGenerating: (nodeId: string) => boolean;
  /** Get error for a specific node */
  getError: (nodeId: string) => AIError | null;
  /** Clear error for a specific node */
  clearError: (nodeId: string) => void;
  /** Retry generation for a node that failed */
  retry: (nodeId: string) => Promise<void>;
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Parse error response into AIError format
 */
function parseError(error: unknown): AIError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        retryable: true,
      };
    }
    
    if (message.includes('api key') || message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth',
        message: 'Authentication failed. Please check your API key configuration.',
        retryable: false,
      };
    }
    
    if (message.includes('timeout') || message.includes('504')) {
      return {
        type: 'timeout',
        message: 'Request timed out. Please try again.',
        retryable: true,
      };
    }
    
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      retryable: true,
    };
  }
  
  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    retryable: true,
  };
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for AI generation with streaming support
 * 
 * Requirements:
 * - 3.3: Stream AI output in real-time to the node
 */
export function useAIGeneration(options: UseAIGenerationOptions = {}): UseAIGenerationReturn {
  const { onStart, onComplete, onError } = options;
  
  // Store actions
  const {
    nodes,
    updateNode,
    startGeneration,
    stopGeneration,
    isGenerating: storeIsGenerating,
  } = useMindNodeStore();
  
  // Track errors per node
  const [errors, setErrors] = useState<Map<string, AIError>>(new Map());
  
  // Track abort controllers for each generation
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  // Track last request params for retry
  const lastRequestParams = useRef<Map<string, { selectionSource?: string; userMessage?: string }>>(new Map());

  /**
   * Generate AI response for a node
   */
  const generate = useCallback(async (
    nodeId: string,
    selectionSource?: string,
    userMessage?: string
  ) => {
    // Store params for potential retry
    lastRequestParams.current.set(nodeId, { selectionSource, userMessage });
    
    // Clear any existing error
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
    
    // Create abort controller for this generation
    const abortController = new AbortController();
    abortControllers.current.set(nodeId, abortController);
    
    // Mark node as generating
    startGeneration(nodeId);
    onStart?.(nodeId);
    
    try {
      // Assemble context path from nodes
      const contextPath = assembleContextFromArray(nodeId, nodes);
      
      // Get the node to check for selectionSource if not provided
      const node = nodes.find(n => n.id === nodeId);
      const effectiveSelectionSource = selectionSource || node?.data.selectionSource;
      
      // Make streaming request
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId,
          contextPath,
          selectionSource: effectiveSelectionSource,
          userMessage,
        }),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let content = '';
      
      // Read stream chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode chunk and append to content
        const chunk = decoder.decode(value, { stream: true });
        content += chunk;
        
        // Update node content in real-time
        // Requirements: 3.3 - Stream output in real-time
        updateNode(nodeId, {
          label: content,
          contextContent: content,
        });
      }
      
      // Generation complete
      stopGeneration(nodeId);
      abortControllers.current.delete(nodeId);
      onComplete?.(nodeId, content);
      
    } catch (error) {
      // Handle abort (user cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        stopGeneration(nodeId);
        abortControllers.current.delete(nodeId);
        return;
      }
      
      // Parse and store error
      const aiError = parseError(error);
      setErrors(prev => {
        const next = new Map(prev);
        next.set(nodeId, aiError);
        return next;
      });
      
      // Update node with error state
      updateNode(nodeId, {
        isGenerating: false,
      });
      
      stopGeneration(nodeId);
      abortControllers.current.delete(nodeId);
      onError?.(nodeId, aiError);
    }
  }, [nodes, updateNode, startGeneration, stopGeneration, onStart, onComplete, onError]);

  /**
   * Stop ongoing generation for a node
   */
  const stop = useCallback((nodeId: string) => {
    const controller = abortControllers.current.get(nodeId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(nodeId);
    }
    stopGeneration(nodeId);
  }, [stopGeneration]);

  /**
   * Check if a specific node is generating
   */
  const isGenerating = useCallback((nodeId: string) => {
    return storeIsGenerating(nodeId);
  }, [storeIsGenerating]);

  /**
   * Get error for a specific node
   */
  const getError = useCallback((nodeId: string): AIError | null => {
    return errors.get(nodeId) || null;
  }, [errors]);

  /**
   * Clear error for a specific node
   */
  const clearError = useCallback((nodeId: string) => {
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
    
    // Also clear error from node data
    updateNode(nodeId, {
      // Clear any error display in the node
    });
  }, [updateNode]);

  /**
   * Retry generation for a node that failed
   */
  const retry = useCallback(async (nodeId: string) => {
    const params = lastRequestParams.current.get(nodeId);
    await generate(nodeId, params?.selectionSource, params?.userMessage);
  }, [generate]);

  return {
    generate,
    stop,
    isGenerating,
    getError,
    clearError,
    retry,
  };
}

export default useAIGeneration;
