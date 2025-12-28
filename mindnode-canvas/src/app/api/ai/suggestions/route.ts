/**
 * AI Suggestions API Route
 * 
 * POST /api/ai/suggestions
 * 
 * Generates intelligent follow-up suggestions for AI nodes.
 * Each suggestion is limited to 15 characters for clarity.
 * 
 * Requirements:
 * - 6.1: Generate 3 suggestion prompts after AI node completes
 * - 6.2: Analyze current node content and full context path
 * - 6.5: Limit each suggestion to 15 characters or less
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ContextNode } from '@/types';

// ============================================
// TYPES
// ============================================

export interface SuggestionsRequest {
  /** The ID of the node to generate suggestions for */
  nodeId: string;
  /** The content of the current node */
  nodeContent: string;
  /** The context path from root to current node */
  contextPath: ContextNode[];
}

export interface SuggestionsResponse {
  /** Array of 3 suggestions, max 15 chars each */
  suggestions: string[];
}

// ============================================
// CONSTANTS
// ============================================

/** Maximum length for each suggestion */
const MAX_SUGGESTION_LENGTH = 15;

/** Number of suggestions to generate */
const SUGGESTION_COUNT = 3;

/** Default model for suggestion generation */
const DEFAULT_MODEL = 'gpt-4-turbo';

// ============================================
// VALIDATION
// ============================================

/**
 * Validate the incoming request body
 */
function validateRequest(body: unknown): { valid: true; data: SuggestionsRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;

  if (!request.nodeId || typeof request.nodeId !== 'string') {
    return { valid: false, error: 'nodeId is required and must be a string' };
  }

  if (!request.nodeContent || typeof request.nodeContent !== 'string') {
    return { valid: false, error: 'nodeContent is required and must be a string' };
  }

  if (!request.contextPath || !Array.isArray(request.contextPath)) {
    return { valid: false, error: 'contextPath is required and must be an array' };
  }

  // Validate each context node
  for (const node of request.contextPath) {
    if (!node || typeof node !== 'object') {
      return { valid: false, error: 'Each context node must be an object' };
    }
    if (!node.id || typeof node.id !== 'string') {
      return { valid: false, error: 'Each context node must have a string id' };
    }
    if (typeof node.content !== 'string') {
      return { valid: false, error: 'Each context node must have a string content' };
    }
    if (!['root', 'user', 'ai'].includes(node.type)) {
      return { valid: false, error: 'Each context node must have a valid type (root, user, ai)' };
    }
  }

  return {
    valid: true,
    data: {
      nodeId: request.nodeId as string,
      nodeContent: request.nodeContent as string,
      contextPath: request.contextPath as ContextNode[],
    },
  };
}

// ============================================
// PROMPT CONSTRUCTION
// ============================================

/**
 * Build the prompt for generating suggestions
 * Requirements: 6.2 - Analyze current node content and full context path
 */
function buildSuggestionsPrompt(nodeContent: string, contextPath: ContextNode[]): string {
  const contextSection = contextPath
    .map((node) => {
      const prefix = node.type === 'user' ? 'User' : node.type === 'ai' ? 'Assistant' : 'Root';
      return `${prefix}: ${node.content}`;
    })
    .join('\n\n');

  return `Based on this conversation context and the latest AI response, generate exactly ${SUGGESTION_COUNT} follow-up questions that a curious learner might ask.

CRITICAL REQUIREMENTS:
- Each question MUST be ${MAX_SUGGESTION_LENGTH} characters or less (including spaces and punctuation)
- Questions should be concise and thought-provoking
- Questions should naturally continue the conversation
- Use abbreviations if needed to stay within the character limit

Context Path:
${contextSection}

Latest Response:
${nodeContent}

Return ONLY the ${SUGGESTION_COUNT} questions, one per line, no numbering, no formatting, no quotes.
Each line must be ${MAX_SUGGESTION_LENGTH} characters or less.`;
}

/**
 * Process and validate suggestions to ensure they meet length requirements
 * Requirements: 6.5 - Limit each suggestion to 15 characters or less
 */
function processSuggestions(rawText: string): string[] {
  return rawText
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, SUGGESTION_COUNT)
    .map(s => {
      // Truncate to max length if needed
      if (s.length > MAX_SUGGESTION_LENGTH) {
        // Try to truncate at a word boundary
        const truncated = s.substring(0, MAX_SUGGESTION_LENGTH);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > MAX_SUGGESTION_LENGTH - 5) {
          return truncated.substring(0, lastSpace) + '?';
        }
        return truncated.substring(0, MAX_SUGGESTION_LENGTH - 1) + '?';
      }
      return s;
    });
}

// ============================================
// API ROUTE HANDLER
// ============================================

/**
 * POST handler for AI suggestions generation
 * 
 * Requirements:
 * - 6.1: Generate 3 suggestion prompts
 * - 6.2: Use context path for intelligent suggestions
 * - 6.5: Limit suggestions to 15 characters
 */
export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const { nodeContent, contextPath } = validation.data;

    // Build the suggestions prompt
    const prompt = buildSuggestionsPrompt(nodeContent, contextPath);

    // Generate suggestions using AI
    const result = await generateText({
      model: openai(DEFAULT_MODEL),
      prompt,
      temperature: 0.8,
      maxTokens: 100,
    });

    // Process and validate suggestions
    const suggestions = processSuggestions(result.text);

    // Ensure we have exactly 3 suggestions (pad with defaults if needed)
    while (suggestions.length < SUGGESTION_COUNT) {
      const defaults = ['Tell me more?', 'Why is that?', 'What else?'];
      suggestions.push(defaults[suggestions.length] || 'Explain more?');
    }

    return new Response(
      JSON.stringify({ suggestions } as SuggestionsResponse),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('AI suggestions error:', error);

    // Determine error type for appropriate response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isRateLimit = errorMessage.toLowerCase().includes('rate limit');
    const isAuth = errorMessage.toLowerCase().includes('api key') || 
                   errorMessage.toLowerCase().includes('unauthorized');

    let statusCode = 500;
    if (isRateLimit) {
      statusCode = 429;
    } else if (isAuth) {
      statusCode = 401;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        suggestions: ['Tell me more?', 'Why is that?', 'What else?'], // Fallback suggestions
      }),
      { 
        status: statusCode, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
