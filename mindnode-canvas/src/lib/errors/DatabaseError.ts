/**
 * Database Error Handling
 * 
 * Implements Task 18.3:
 * - Handle connection failures
 * - Handle write conflicts
 * - Display user-friendly error messages
 * 
 * Requirements: 15.2
 */

export enum DatabaseErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  WRITE_CONFLICT = 'WRITE_CONFLICT',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

export interface DatabaseErrorDetails {
  type: DatabaseErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  originalError?: Error;
  statusCode?: number;
}

/**
 * Custom error class for database operations
 * Requirements: 15.2 - Handle database operations failures
 */
export class DatabaseError extends Error {
  public readonly type: DatabaseErrorType;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly originalError?: Error;
  public readonly statusCode?: number;

  constructor(details: DatabaseErrorDetails) {
    super(details.message);
    this.name = 'DatabaseError';
    this.type = details.type;
    this.userMessage = details.userMessage;
    this.retryable = details.retryable;
    this.originalError = details.originalError;
    this.statusCode = details.statusCode;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  /**
   * Create a DatabaseError from a fetch response
   */
  static async fromResponse(response: Response): Promise<DatabaseError> {
    const statusCode = response.status;
    let message = response.statusText;
    
    try {
      const body = await response.json();
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Ignore JSON parse errors
    }

    let type: DatabaseErrorType;
    let userMessage: string;
    let retryable: boolean;

    switch (statusCode) {
      case 401:
      case 403:
        type = DatabaseErrorType.UNAUTHORIZED;
        userMessage = 'You are not authorized to perform this action. Please log in again.';
        retryable = false;
        break;
      case 404:
        type = DatabaseErrorType.NOT_FOUND;
        userMessage = 'The requested resource was not found.';
        retryable = false;
        break;
      case 408:
      case 504:
        type = DatabaseErrorType.TIMEOUT;
        userMessage = 'The request timed out. Please try again.';
        retryable = true;
        break;
      case 409:
        type = DatabaseErrorType.WRITE_CONFLICT;
        userMessage = 'This item was modified by another user. Please refresh and try again.';
        retryable = true;
        break;
      case 422:
        type = DatabaseErrorType.CONSTRAINT_VIOLATION;
        userMessage = 'The data you entered is invalid. Please check and try again.';
        retryable = false;
        break;
      case 500:
      case 502:
      case 503:
        type = DatabaseErrorType.CONNECTION_FAILED;
        userMessage = 'Unable to connect to the server. Please check your connection and try again.';
        retryable = true;
        break;
      default:
        type = DatabaseErrorType.UNKNOWN;
        userMessage = 'An unexpected error occurred. Please try again.';
        retryable = true;
    }

    return new DatabaseError({
      type,
      message: `Database error: ${message} (${statusCode})`,
      userMessage,
      retryable,
      statusCode,
    });
  }

  /**
   * Create a DatabaseError from a generic error
   */
  static fromError(error: Error): DatabaseError {
    // Check if it's a network error
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new DatabaseError({
        type: DatabaseErrorType.CONNECTION_FAILED,
        message: error.message,
        userMessage: 'Unable to connect to the server. Please check your connection and try again.',
        retryable: true,
        originalError: error,
      });
    }

    // Check if it's a timeout
    if (error.message.includes('timeout')) {
      return new DatabaseError({
        type: DatabaseErrorType.TIMEOUT,
        message: error.message,
        userMessage: 'The request timed out. Please try again.',
        retryable: true,
        originalError: error,
      });
    }

    // Default to unknown error
    return new DatabaseError({
      type: DatabaseErrorType.UNKNOWN,
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      originalError: error,
    });
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof DatabaseError) {
      return error.retryable;
    }
    return true; // Default to retryable for unknown errors
  }

  /**
   * Get user-friendly message from any error
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof DatabaseError) {
      return error.userMessage;
    }
    if (error instanceof Error) {
      return 'An unexpected error occurred. Please try again.';
    }
    return 'An unknown error occurred. Please try again.';
  }
}

/**
 * Error handler for database operations
 * Requirements: 15.2 - Display user-friendly error messages
 */
export class DatabaseErrorHandler {
  private errorCallbacks: Array<(error: DatabaseError) => void> = [];

  /**
   * Register a callback to be called when an error occurs
   */
  onError(callback: (error: DatabaseError) => void): () => void {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Handle a database error
   */
  handleError(error: unknown): DatabaseError {
    let dbError: DatabaseError;

    if (error instanceof DatabaseError) {
      dbError = error;
    } else if (error instanceof Error) {
      dbError = DatabaseError.fromError(error);
    } else {
      dbError = new DatabaseError({
        type: DatabaseErrorType.UNKNOWN,
        message: String(error),
        userMessage: 'An unexpected error occurred. Please try again.',
        retryable: true,
      });
    }

    // Notify all callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(dbError);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });

    return dbError;
  }

  /**
   * Handle a fetch response and throw DatabaseError if not ok
   */
  async handleResponse(response: Response): Promise<Response> {
    if (!response.ok) {
      const error = await DatabaseError.fromResponse(response);
      this.handleError(error);
      throw error;
    }
    return response;
  }
}

// Singleton instance
export const databaseErrorHandler = new DatabaseErrorHandler();
