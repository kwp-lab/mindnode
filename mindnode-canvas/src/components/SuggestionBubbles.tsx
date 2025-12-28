'use client';

/**
 * SuggestionBubbles Component
 * 
 * Displays intelligent follow-up suggestions near AI nodes.
 * Suggestions appear as clickable bubbles that create new branches.
 * 
 * Requirements:
 * - 6.3: Display suggestions as clickable bubbles near the node
 * - 6.4: Create child node with suggestion and trigger AI response on click
 */

import React, { memo, useCallback, useState, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface SuggestionBubblesProps {
  /** The ID of the node these suggestions belong to */
  nodeId: string;
  /** Array of suggestion strings (max 3, each max 15 chars) */
  suggestions: string[];
  /** Callback when a suggestion is clicked */
  onSuggestionClick: (suggestion: string) => void;
  /** Whether the suggestions should be visible */
  visible?: boolean;
  /** Position offset from the node */
  position?: 'right' | 'bottom';
}

// ============================================
// ANIMATION STYLES
// ============================================

/**
 * CSS keyframes for bubble animation
 * Requirements: 6.3 - Animate appearance after generation
 */
const animationStyles = `
  @keyframes suggestionBubbleIn {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes suggestionPulse {
    0%, 100% {
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
    }
    50% {
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
  }
`;

// ============================================
// COMPONENT
// ============================================

function SuggestionBubbles({
  nodeId,
  suggestions,
  onSuggestionClick,
  visible = true,
  position = 'bottom',
}: SuggestionBubblesProps) {
  // Track which suggestions have been animated in
  const [animatedIn, setAnimatedIn] = useState(false);
  
  // Trigger animation after mount
  useEffect(() => {
    if (visible && suggestions.length > 0) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => {
        setAnimatedIn(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedIn(false);
    }
  }, [visible, suggestions.length]);

  /**
   * Handle suggestion click
   * Requirements: 6.4 - Create child node with suggestion on click
   */
  const handleClick = useCallback(
    (suggestion: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onSuggestionClick(suggestion);
    },
    [onSuggestionClick]
  );

  // Don't render if no suggestions or not visible
  if (!visible || suggestions.length === 0) {
    return null;
  }

  // Position styles based on prop
  const containerPositionStyles = position === 'right'
    ? 'absolute left-full top-1/2 -translate-y-1/2 ml-4 flex-col'
    : 'absolute top-full left-1/2 -translate-x-1/2 mt-3 flex-row';

  return (
    <>
      {/* Inject animation styles */}
      <style>{animationStyles}</style>
      
      <div
        className={`flex gap-2 ${containerPositionStyles}`}
        data-testid={`suggestion-bubbles-${nodeId}`}
        role="group"
        aria-label="Follow-up suggestions"
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={`${nodeId}-suggestion-${index}`}
            onClick={(e) => handleClick(suggestion, e)}
            className={`
              px-3 py-1.5 
              text-xs font-medium
              bg-gradient-to-r from-blue-50 to-indigo-50
              text-blue-700
              border border-blue-200
              rounded-full
              shadow-sm
              hover:from-blue-100 hover:to-indigo-100
              hover:border-blue-300
              hover:shadow-md
              active:scale-95
              transition-all duration-200
              cursor-pointer
              whitespace-nowrap
              max-w-[120px]
              truncate
              ${animatedIn ? 'opacity-100' : 'opacity-0'}
            `}
            style={{
              animation: animatedIn 
                ? `suggestionBubbleIn 0.3s ease-out ${index * 0.1}s forwards, suggestionPulse 2s ease-in-out ${0.3 + index * 0.1}s infinite`
                : 'none',
              animationFillMode: 'both',
            }}
            data-testid={`suggestion-bubble-${index}`}
            title={suggestion}
            aria-label={`Suggestion: ${suggestion}`}
          >
            <span className="flex items-center gap-1">
              <span className="text-blue-400">💡</span>
              <span className="truncate">{suggestion}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// Memoize for performance
export default memo(SuggestionBubbles, (prevProps, nextProps) => {
  return (
    prevProps.nodeId === nextProps.nodeId &&
    prevProps.visible === nextProps.visible &&
    prevProps.position === nextProps.position &&
    prevProps.suggestions.length === nextProps.suggestions.length &&
    prevProps.suggestions.every((s, i) => s === nextProps.suggestions[i])
  );
});
