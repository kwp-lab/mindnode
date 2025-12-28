/**
 * AI Generation API Route
 * 
 * POST /api/ai/generate
 * 
 * Generates AI responses with streaming support using Vercel AI SDK.
 * Uses the context assembly engine to build prompts from the conversation path.
 * 
 * Requirements:
 * - 3.1: Automatically trigger AI response when creating child node
 * - 3.2: Assemble context from complete path from root to current node
 * - 3.3: Stream AI output in real-time to the node
 */

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ContextNode } from '@/types';
import { buildAIPrompt } from '@/lib/context';

// ============================================
// TYPES
// ============================================

export interface GenerateRequest {
  /** The ID of the node being generated */
  nodeId: string;
  /** The context path from root to current node */
  contextPath: ContextNode[];
  /** Optional selected text that triggered the branch */
  selectionSource?: string;
  /** Optional user message/question */
  userMessage?: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Default model configuration
 */
const DEFAULT_MODEL = 'gpt-4-turbo';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1000;

// ============================================
// VALIDATION
// ============================================

/**
 * Validate the incoming request body
 */
function validateRequest(body: unknown): { valid: true; data: GenerateRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const request = body as Record<string, unknown>;

  if (!request.nodeId || typeof request.nodeId !== 'string') {
    return { valid: false, error: 'nodeId is required and must be a string' };
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

  if (request.selectionSource !== undefined && typeof request.selectionSource !== 'string') {
    return { valid: false, error: 'selectionSource must be a string if provided' };
  }

  if (request.userMessage !== undefined && typeof request.userMessage !== 'string') {
    return { valid: false, error: 'userMessage must be a string if provided' };
  }

  return {
    valid: true,
    data: {
      nodeId: request.nodeId as string,
      contextPath: request.contextPath as ContextNode[],
      selectionSource: request.selectionSource as string | undefined,
      userMessage: request.userMessage as string | undefined,
    },
  };
}

// ============================================
// API ROUTE HANDLER
// ============================================

/**
 * POST handler for AI generation with streaming
 * 
 * Requirements:
 * - 3.1: Trigger AI response
 * - 3.2: Use context from root to current node
 * - 3.3: Stream output in real-time
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

    const { contextPath, selectionSource, userMessage } = validation.data;

    // Build the AI prompt using context assembly engine
    // Requirements: 3.2 - Assemble context from complete path
    const promptResult = buildAIPrompt(
      contextPath,
      userMessage,
      selectionSource
    );

    // Log if context was truncated (for debugging)
    if (promptResult.wasTruncated) {
      console.warn(
        `Context truncated: ${promptResult.includedNodes}/${promptResult.totalNodes} nodes included`
      );
    }

    // Stream the AI response
    // Requirements: 3.3 - Stream output in real-time
    const result = streamText({
      model: openai(DEFAULT_MODEL),
      messages: [
        { role: 'user', content: promptResult.prompt }
      ],
      temperature: DEFAULT_TEMPERATURE,
      maxOutputTokens: DEFAULT_MAX_TOKENS,
    });

    // Return streaming response
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('AI generation error:', error);

    // Determine error type for appropriate response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isRateLimit = errorMessage.toLowerCase().includes('rate limit');
    const isAuth = errorMessage.toLowerCase().includes('api key') || 
                   errorMessage.toLowerCase().includes('unauthorized');
    const isTimeout = errorMessage.toLowerCase().includes('timeout');

    let statusCode = 500;
    let errorType = 'unknown';

    if (isRateLimit) {
      statusCode = 429;
      errorType = 'rate_limit';
    } else if (isAuth) {
      statusCode = 401;
      errorType = 'auth';
    } else if (isTimeout) {
      statusCode = 504;
      errorType = 'timeout';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        type: errorType,
        retryable: isRateLimit || isTimeout,
      }),
      { 
        status: statusCode, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
